FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN test -f /app/manage.py \
    && DJANGO_SECRET_KEY=collectstatic-build-only python manage.py collectstatic --noinput \
    && useradd --system --create-home --shell /usr/sbin/nologin app

USER app

EXPOSE 8000

CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "3", "--access-logfile", "-"]
