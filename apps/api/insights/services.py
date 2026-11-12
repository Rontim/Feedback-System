import logging

from django.conf import settings
from django.db import transaction

from alerts.dispatch import run_in_background
from feedback.models import Response

from .client import AiError, CommentTagger
from .models import CommentAnalysis

logger = logging.getLogger(__name__)


def get_tagger() -> CommentTagger | None:
    """None when no API key is set, so the whole feature quietly switches off."""
    if not settings.AI_API_KEY:
        return None
    return CommentTagger(
        api_key=settings.AI_API_KEY,
        base_url=settings.AI_BASE_URL,
        model=settings.AI_MODEL,
        timeout=settings.AI_TIMEOUT,
        max_tokens=settings.AI_MAX_TOKENS,
        disable_thinking=settings.AI_DISABLE_THINKING,
    )


def is_enabled() -> bool:
    return bool(settings.AI_API_KEY)


def tag_response(response_id: int) -> str:
    """Tag one response's comment. Never raises. Returns tagged | skipped | failed.

    Only the comment text leaves the system: no name, email or phone number is sent.
    """
    response = Response.objects.filter(pk=response_id).first()
    if response is None or not response.comment.strip():
        return "skipped"
    if CommentAnalysis.objects.filter(response=response).exists():
        return "skipped"
    tagger = get_tagger()
    if tagger is None:
        return "skipped"
    try:
        tag = tagger.classify(response.comment)
    except AiError as exc:
        logger.warning("Comment tagging failed for response %s: %s", response_id, exc)
        return "failed"
    CommentAnalysis.objects.update_or_create(
        response=response,
        defaults={"sentiment": tag.sentiment, "topic": tag.topic, "model": tagger.model},
    )
    return "tagged"


def schedule_tagging(response: Response) -> None:
    """Called inside the feedback transaction; runs after commit, in the background."""
    if is_enabled() and response.comment.strip():
        transaction.on_commit(lambda: run_in_background(tag_response, response.pk))
