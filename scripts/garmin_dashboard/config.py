"""Environment-variable configuration for the health dashboard pipeline."""

import os

from dotenv import load_dotenv

load_dotenv()

GARMIN_EMAIL = os.environ.get("GARMIN_EMAIL")
GARMIN_PASSWORD = os.environ.get("GARMIN_PASSWORD")

GMAIL_ADDRESS = os.environ.get("GMAIL_ADDRESS")
GMAIL_APP_PASSWORD = os.environ.get("GMAIL_APP_PASSWORD")
RECIPIENT_EMAIL = os.environ.get("RECIPIENT_EMAIL") or GMAIL_ADDRESS

# "Noon local time" has no direct GitHub Actions cron equivalent (cron is
# UTC-only and doesn't shift for DST). The workflow instead fires twice a
# day, at the two UTC hours that correspond to noon Eastern across DST, and
# this check makes the "wrong" one of the two a no-op.
REPORT_TIMEZONE = os.environ.get("REPORT_TIMEZONE", "America/New_York")
REPORT_TARGET_HOUR = int(os.environ.get("REPORT_TARGET_HOUR", "12"))

# How many past days to backfill the first time the history file is empty
# (or nearly empty), vs. the small re-fetch window used on every normal run
# to catch data that finalizes late (e.g. sleep data synced the next
# afternoon).
INITIAL_BACKFILL_DAYS = int(os.environ.get("INITIAL_BACKFILL_DAYS", "30"))
DAILY_REFRESH_DAYS = int(os.environ.get("DAILY_REFRESH_DAYS", "2"))

_REQUIRED = {
    "GARMIN_EMAIL": GARMIN_EMAIL,
    "GARMIN_PASSWORD": GARMIN_PASSWORD,
    "GMAIL_ADDRESS": GMAIL_ADDRESS,
    "GMAIL_APP_PASSWORD": GMAIL_APP_PASSWORD,
}


def validate() -> None:
    missing = [name for name, value in _REQUIRED.items() if not value]
    if missing:
        raise RuntimeError(
            f"Missing required environment variables: {', '.join(missing)}"
        )
