"""Run side effects (email, SMS, AI) after the feedback transaction has committed.

A small thread pool is enough here and needs no extra infrastructure. Failures are logged
and recorded on the alert row; they never propagate to the customer's request.
"""

import logging
from collections.abc import Callable
from concurrent.futures import ThreadPoolExecutor

from django.conf import settings
from django.db import connection

logger = logging.getLogger(__name__)

_executor = ThreadPoolExecutor(max_workers=4, thread_name_prefix="alerts")


def _run(fn: Callable[..., None], args: tuple, *, close_connection: bool) -> None:
    try:
        fn(*args)
    except Exception:
        logger.exception("Background task %s failed", getattr(fn, "__name__", fn))
    finally:
        if close_connection:
            connection.close()  # worker threads own their own DB connection


def run_in_background(fn: Callable[..., None], *args) -> None:
    if settings.ALERT_DISPATCH_SYNC:  # tests and one-off scripts
        _run(fn, args, close_connection=False)
    else:
        _executor.submit(_run, fn, args, close_connection=True)
