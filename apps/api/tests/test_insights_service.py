import pytest
from django.core.management import CommandError, call_command
from rest_framework.test import APIClient

from feedback.models import Response
from insights.client import AiError, CommentTag
from insights.models import CommentAnalysis
from insights.services import tag_response

from .factories import make_analysis, make_response

pytestmark = pytest.mark.django_db


def test_tags_a_comment_and_records_the_model(fake_tagger):
    response = make_response(comment="Delivery was late")
    assert tag_response(response.pk) == "tagged"
    analysis = CommentAnalysis.objects.get()
    assert (analysis.sentiment, analysis.topic, analysis.model) == (
        "negative",
        "delivery",
        "fake-model",
    )


def test_only_the_comment_text_is_sent_to_the_model(fake_tagger):
    response = make_response(comment="Delivery was late")
    tag_response(response.pk)
    assert fake_tagger.seen == ["Delivery was late"]  # no name, email or phone


@pytest.mark.parametrize("comment", ["", "   "])
def test_blank_comments_are_never_sent(fake_tagger, comment):
    response = make_response(comment=comment)
    assert tag_response(response.pk) == "skipped"
    assert fake_tagger.seen == []


def test_already_tagged_comments_are_not_sent_again(fake_tagger):
    response = make_response(comment="Late")
    make_analysis(response)
    assert tag_response(response.pk) == "skipped"
    assert fake_tagger.seen == []


def test_nothing_happens_without_an_api_key(post_feedback):
    assert post_feedback().status_code == 201
    assert CommentAnalysis.objects.count() == 0


def test_unknown_response_id_is_skipped(fake_tagger):
    assert tag_response(999_999) == "skipped"


def test_failure_stores_nothing_and_reports_failed(fake_tagger):
    fake_tagger.error = AiError("rate limited")
    response = make_response(comment="Late")
    assert tag_response(response.pk) == "failed"
    assert CommentAnalysis.objects.count() == 0


def test_feedback_with_a_comment_is_tagged_after_commit(fake_tagger, post_feedback):
    res = post_feedback(comment="Delivery was late")
    assert res.status_code == 201
    response = Response.objects.get()
    assert response.analysis.topic == "delivery"


def test_feedback_without_a_comment_never_calls_the_model(fake_tagger, post_feedback):
    post_feedback(comment="")
    assert fake_tagger.seen == []


def test_ai_outage_never_loses_feedback_or_blocks_alerts(fake_tagger, care_rep, post_feedback):
    from django.core import mail

    fake_tagger.error = AiError("503")
    res = post_feedback(comment="Delivery was late")  # a detractor with a comment
    assert res.status_code == 201
    assert Response.objects.count() == 1 and CommentAnalysis.objects.count() == 0
    assert len(mail.outbox) == 1  # the alert email is independent of the AI call


def test_an_unexpected_crash_in_tagging_is_contained(fake_tagger, post_feedback):
    fake_tagger.error = RuntimeError("bug")  # not an AiError
    res = post_feedback(comment="Late")
    assert res.status_code == 201 and Response.objects.count() == 1


def test_backfill_tags_only_untagged_comments(fake_tagger, capsys):
    tagged = make_response(comment="Already done")
    make_analysis(tagged)
    make_response(comment="Needs tag one")
    make_response(comment="Needs tag two")
    make_response(comment="")
    call_command("tag_comments", "--sleep=0")
    assert sorted(fake_tagger.seen) == ["Needs tag one", "Needs tag two"]
    assert CommentAnalysis.objects.count() == 3
    assert "tagged 2, failed 0" in capsys.readouterr().out


def test_backfill_respects_limit_and_reports_failures(fake_tagger, capsys):
    for i in range(3):
        make_response(comment=f"c{i}")
    fake_tagger.error = AiError("429")
    call_command("tag_comments", "--sleep=0", "--limit=2")
    assert len(fake_tagger.seen) == 2
    assert "tagged 0, failed 2" in capsys.readouterr().out


def test_backfill_requires_a_key():
    with pytest.raises(CommandError, match="AI_API_KEY"):
        call_command("tag_comments")


def test_ai_check_command(fake_tagger, capsys):
    fake_tagger.result = CommentTag(sentiment="neutral", topic="price")
    call_command("ai_check")
    out = capsys.readouterr().out
    assert "fake-model" in out and "price / neutral" in out
    fake_tagger.error = AiError("bad key")
    with pytest.raises(CommandError, match="bad key"):
        call_command("ai_check")


def test_tags_are_exposed_by_the_responses_api(rep_client, fake_tagger):
    tagged = make_response(comment="Late")
    make_analysis(tagged, "negative", "delivery")
    plain = make_response()
    assert rep_client.get(f"/api/responses/{tagged.id}").json()["analysis"] == {
        "sentiment": "negative",
        "topic": "delivery",
    }
    assert rep_client.get(f"/api/responses/{plain.id}").json()["analysis"] is None


def test_responses_can_be_filtered_by_sentiment_and_topic(rep_client):
    a = make_response(comment="a")
    b = make_response(comment="b")
    c = make_response(comment="c")
    make_analysis(a, "negative", "delivery")
    make_analysis(b, "positive", "colour")
    make_analysis(c, "negative", "price")
    ids = lambda q: {r["id"] for r in rep_client.get(f"/api/responses?{q}").json()["results"]}  # noqa: E731
    assert ids("sentiment=negative") == {a.id, c.id}
    assert ids("topic=colour") == {b.id}
    assert ids("sentiment=negative&topic=price,delivery") == {a.id, c.id}
    assert ids("topic=service") == set()


def test_alerts_carry_the_tags_so_reps_see_the_topic(rep_client):
    from alerts.models import Alert

    response = make_response((1, 1, 1), comment="Rude staff")
    make_analysis(response, "negative", "service")
    Alert.objects.create(response=response)
    item = rep_client.get("/api/alerts").json()["results"][0]
    assert item["response"]["analysis"] == {"sentiment": "negative", "topic": "service"}


def test_topics_endpoint_requires_a_care_rep():
    assert APIClient().get("/api/stats/topics").status_code == 403
