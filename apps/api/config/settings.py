import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent


def env(key: str, default: str | None = None) -> str:
    value = os.environ.get(key, default)
    if value is None:
        raise RuntimeError(f"Missing required environment variable: {key}")
    return value


DEBUG = env("DJANGO_DEBUG", "0") == "1"
SECRET_KEY = env("DJANGO_SECRET_KEY",
                 "dev-only-insecure-key" if DEBUG else None)
ALLOWED_HOSTS = env("DJANGO_ALLOWED_HOSTS",
                    "localhost,127.0.0.1,api").split(",")
CSRF_TRUSTED_ORIGINS = [o for o in env(
    "DJANGO_CSRF_TRUSTED_ORIGINS", "").split(",") if o]

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "accounts",
    "feedback",
    "alerts",
    "stats",
    "sms",
    "insights",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ]
        },
    }
]

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": env("POSTGRES_DB", "feedback"),
        "USER": env("POSTGRES_USER", "feedback"),
        "PASSWORD": env("POSTGRES_PASSWORD", "feedback"),
        "HOST": env("POSTGRES_HOST", "localhost"),
        "PORT": env("POSTGRES_PORT", "5432"),
    }
}

AUTH_USER_MODEL = "accounts.User"
LANGUAGE_CODE = "en-us"
# Dashboard days (trend buckets, date filters) follow this zone; timestamps are stored in UTC.
TIME_ZONE = env("TIME_ZONE", "Africa/Nairobi")
USE_I18N = True
USE_TZ = True

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": ["rest_framework.authentication.SessionAuthentication"],
    "DEFAULT_PERMISSION_CLASSES": ["accounts.permissions.IsCareRep"],
    "DEFAULT_PAGINATION_CLASS": "config.pagination.StandardPagination",
    "PAGE_SIZE": 20,
    "DEFAULT_THROTTLE_RATES": {
        "feedback": env("FEEDBACK_THROTTLE", "30/min"),
        "login": env("LOGIN_THROTTLE", "10/min"),
        "sms_inbound": env("SMS_INBOUND_THROTTLE", "300/min"),
        "sms_invite": env("SMS_INVITE_THROTTLE", "30/hour"),
    },
}

# Email: Mailpit locally, real SMTP in staging/prod.
EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
EMAIL_HOST = env("EMAIL_HOST", "localhost")
EMAIL_PORT = int(env("EMAIL_PORT", "1025"))
DEFAULT_FROM_EMAIL = env("DEFAULT_FROM_EMAIL", "feedback@companyx.test")

# Alerts
# Used only when no active care rep has an email address on file.
CARE_ALERT_FALLBACK_EMAIL = env("CARE_ALERT_FALLBACK_EMAIL", "")
DASHBOARD_URL = env("DASHBOARD_URL", "http://localhost:3000/dashboard")
# Run alert delivery inline instead of in a worker thread (tests, one-off scripts).
ALERT_DISPATCH_SYNC = env("ALERT_DISPATCH_SYNC", "0") == "1"

if not DEBUG:
    SESSION_COOKIE_SECURE = env("SECURE_COOKIES", "1") == "1"
    CSRF_COOKIE_SECURE = SESSION_COOKIE_SECURE

# SMS (Africa's Talking). With no API key, SMS is skipped and everything else keeps working.
# must be "sandbox" for the sandbox environment
AT_USERNAME = env("AT_USERNAME", "sandbox")
AT_API_KEY = env("AT_API_KEY", "")
# override the gateway endpoint (staging, local stand-in)
AT_BASE_URL = env("AT_BASE_URL", "")
# shortcode or alphanumeric sender id, optional
AT_SENDER_ID = env("AT_SENDER_ID", "")
# The callback URL is /api/sms/inbound?token=<this>. Unset means the webhook rejects everything.
AT_WEBHOOK_TOKEN = env("AT_WEBHOOK_TOKEN", "")
SMS_HTTP_TIMEOUT = float(env("SMS_HTTP_TIMEOUT", "10"))
SMS_MAX_RESPONSES_PER_DAY = int(
    env("SMS_MAX_RESPONSES_PER_DAY", "5"))  # per phone, anti-spam
DEFAULT_COUNTRY_CODE = env("DEFAULT_COUNTRY_CODE", "254")
# Plain ASCII keeps the message in one 160-character GSM segment.
SMS_INVITE_TEXT = env(
    "SMS_INVITE_TEXT",
    "Thanks for buying our paint! Rate us 1-5 for product, care and happiness. Reply e.g. 4 5 4",
)


AI_API_KEY = env("AI_API_KEY", "")
AI_BASE_URL = env("AI_BASE_URL", "")
AI_MODEL = env("AI_MODEL", "")
AI_TIMEOUT = float(env("AI_TIMEOUT", "20"))
AI_MAX_TOKENS = int(env("AI_MAX_TOKENS", "300"))
