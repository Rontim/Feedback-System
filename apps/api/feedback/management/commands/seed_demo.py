import random
from datetime import datetime, time, timedelta

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from alerts.models import Alert, DeliveryStatus, Notification
from feedback import scoring
from feedback.models import Customer, Response

SEED_DOMAIN = "@seed.example"
OPENING_TIME = time(7, 0)
OPENING_TIME_PLUS = time(7, 30)  # leave room for at least a few minutes of "today" data
FIRST = ["Amina", "Brian", "Cynthia", "David", "Esther", "Felix", "Grace", "Hassan", "Irene",
         "James", "Kevin", "Lucy", "Moses", "Njeri", "Omar", "Purity", "Quincy", "Rose",
         "Samuel", "Tabitha", "Victor", "Wanjiru", "Yusuf", "Zawadi"]  # fmt: skip
LAST = ["Otieno", "Kamau", "Mwangi", "Njoroge", "Wafula", "Achieng", "Kiptoo", "Mutua",
        "Abdi", "Odhiambo", "Chebet", "Karanja", "Wekesa", "Nyambura"]  # fmt: skip
NEGATIVE = [
    "The colour came out different from the sample.",
    "Delivery took over a week and nobody called.",
    "Price went up since my last purchase.",
    "Customer care took three days to reply.",
    "Paint peeled after two months.",
]
POSITIVE = [
    "Great coverage, one coat was enough.",
    "Quick delivery and a helpful rep.",
    "Colour matches exactly what I chose.",
    "Good price for the quality.",
]


def _clamp(value: float) -> int:
    return max(1, min(5, round(value)))


def _bulk_create_keeping_created_at(model, objs) -> None:
    """auto_now_add overwrites created_at on bulk_create; put the intended values back."""
    wanted = [obj.created_at for obj in objs]
    model.objects.bulk_create(objs)
    for obj, when in zip(objs, wanted, strict=True):
        obj.created_at = when
    model.objects.bulk_update(objs, ["created_at"])


class Command(BaseCommand):
    help = "Create ~30 days of realistic demo feedback (and a demo care rep) for the dashboard."

    def add_arguments(self, parser):
        parser.add_argument("--days", type=int, default=30)
        parser.add_argument("--per-day", type=int, default=10, help="Average responses per day.")
        parser.add_argument("--seed", type=int, default=42, help="Random seed (repeatable data).")
        parser.add_argument(
            "--reset", action="store_true", help="Delete earlier seeded data first."
        )
        parser.add_argument("--rep-username", default="demo")
        parser.add_argument("--rep-password", default="demo-pass-123")
        parser.add_argument(
            "--rep-phone", default="", help="Phone for the demo rep so SMS alerts can be demoed."
        )

    def handle(
        self, *args, days, per_day, seed, reset, rep_username, rep_password, rep_phone, **options
    ):
        seeded = Customer.objects.filter(email__endswith=SEED_DOMAIN)
        if seeded.exists():
            if not reset:
                raise CommandError("Seed data already exists. Re-run with --reset to replace it.")
            seeded.delete()  # cascades to responses and alerts

        rng = random.Random(seed)
        rep = self._ensure_rep(rep_username, rep_password, rep_phone)
        customers = self._create_customers(rng)
        now = timezone.localtime()
        today = now.date()

        responses: list[Response] = []
        for offset in range(days):
            day = today - timedelta(days=days - 1 - offset)
            progress = offset / max(1, days - 1)
            level = 3.0 + 0.8 * progress  # satisfaction drifts upward so the trend is meaningful
            count = max(1, round(rng.gauss(per_day * (0.6 if day.weekday() >= 5 else 1.1), 2)))
            if day == today and now.time() < OPENING_TIME_PLUS:
                continue  # the business day has not really started yet; never stamp the future
            for _ in range(count):
                responses.append(self._make_response(rng, rng.choice(customers), day, now, level))

        _bulk_create_keeping_created_at(Response, responses)
        alerts = self._create_alerts(rng, responses, rep, now)
        self.stdout.write(
            self.style.SUCCESS(
                f"Seeded {len(responses)} responses over {days} days, {len(alerts)} alerts."
            )
        )
        self.stdout.write(f"Care rep login: {rep_username} / {rep_password}")

    def _ensure_rep(self, username: str, password: str, phone: str):
        User = get_user_model()
        rep, created = User.objects.get_or_create(
            username=username, defaults={"email": f"{username}@companyx.test", "first_name": "Demo"}
        )
        if created:
            rep.set_password(password)
        if phone:
            rep.phone = phone
        rep.save()
        return rep

    def _create_customers(self, rng: random.Random) -> list[Customer]:
        customers, phones = [], set()
        while len(customers) < 80:
            phone = f"+2547{rng.randint(10_000_000, 99_999_999)}"
            if phone in phones or Customer.objects.filter(phone=phone).exists():
                continue
            phones.add(phone)
            first, last = rng.choice(FIRST), rng.choice(LAST)
            customers.append(
                Customer(
                    name=f"{first} {last}",
                    email=f"{first}.{last}.{len(customers)}{SEED_DOMAIN}".lower(),
                    phone=phone,
                    type=Customer.Type.PAINTER if rng.random() < 0.35 else Customer.Type.HOMEOWNER,
                )
            )
        return Customer.objects.bulk_create(customers)

    def _make_response(self, rng, customer, day, now, level) -> Response:
        scores = [
            _clamp(rng.gauss(level + bias, 1.0)) for bias in (0.0, -0.2, 0.1)
        ]  # product, care (slightly harder), happiness
        result = scoring.score(*scores)
        start = datetime.combine(day, OPENING_TIME)
        end = now.replace(tzinfo=None) if day == now.date() else datetime.combine(day, time(20, 0))
        moment = start + timedelta(seconds=rng.randint(0, int((end - start).total_seconds())))
        comment = ""
        if rng.random() < 0.35:
            pool = NEGATIVE if result.category == scoring.DETRACTOR else POSITIVE
            comment = rng.choice(pool)
        is_sms = customer.type == Customer.Type.PAINTER and rng.random() < 0.7
        return Response(
            customer=customer,
            q_product=scores[0],
            q_care=scores[1],
            q_happy=scores[2],
            score_sum=result.total,
            mean=result.mean,
            category=result.category,
            channel=Response.Channel.SMS if is_sms else Response.Channel.WEB,
            comment="" if is_sms else comment,
            created_at=timezone.make_aware(moment),
        )

    def _create_alerts(self, rng, responses, rep, now) -> list[Alert]:
        alerts = []
        for response in responses:
            if response.category != scoring.DETRACTOR:
                continue
            age = now - response.created_at
            handled = age > timedelta(days=3) or (age > timedelta(days=1) and rng.random() < 0.5)
            opened = handled or age > timedelta(days=1)
            stamp = response.created_at + timedelta(hours=rng.randint(1, 20))
            alerts.append(
                Alert(
                    response=response,
                    email_status=DeliveryStatus.SKIPPED,  # seeded, nothing was emailed
                    sms_status=DeliveryStatus.SKIPPED,
                    read_at=stamp if opened else None,
                    handled_at=stamp if handled else None,
                    handled_by=rep if handled else None,
                    created_at=response.created_at,
                )
            )
        _bulk_create_keeping_created_at(Alert, alerts)
        notifications = [
            Notification(rep=rep, alert=a, read_at=a.read_at, created_at=a.created_at)
            for a in alerts
            if a.handled_at is None
        ]
        _bulk_create_keeping_created_at(Notification, notifications)
        return alerts
