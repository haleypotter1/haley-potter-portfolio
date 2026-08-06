"""Entrypoint: fetch today's Garmin metrics, update the historical dataset,
recompute analytics, render charts, and email the report.

Run manually with:
    python scripts/run_daily_report.py

Set FORCE_RUN=1 to bypass the "only run at local noon" guard (the workflow
sets this automatically for manual workflow_dispatch triggers).
"""

import logging
import os
import sys
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

sys.path.insert(0, os.path.dirname(__file__))

from garmin_dashboard import analytics, charts, config, email_sender, ingest, report, storage
from garminconnect import Garmin

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("garmin_dashboard.run")

CHART_BUILDERS = [
    ("sleep_chart", analytics.sleep_vs_workout, charts.sleep_vs_workout_chart),
    ("hrv_chart", analytics.hrv_vs_training_load, charts.hrv_vs_training_load_chart),
    ("mileage_chart", analytics.weekly_mileage_vs_rhr, charts.weekly_mileage_vs_rhr_chart),
    ("bb_chart", analytics.body_battery_vs_workout, charts.body_battery_vs_workout_chart),
]


def should_run_now() -> bool:
    if os.environ.get("FORCE_RUN") == "1":
        return True
    now_local = datetime.now(ZoneInfo(config.REPORT_TIMEZONE))
    return now_local.hour == config.REPORT_TARGET_HOUR


def dates_to_fetch(existing_dates: set[str], today: str) -> list[str]:
    """Today, always — plus either a small daily refresh window (to catch
    data that finalizes late) or a larger one-time backfill if the dataset
    is essentially empty.
    """
    is_bootstrap = len(existing_dates) < 5
    window = config.INITIAL_BACKFILL_DAYS if is_bootstrap else config.DAILY_REFRESH_DAYS
    today_date = datetime.strptime(today, "%Y-%m-%d").date()

    dates = [
        (today_date - timedelta(days=i)).strftime("%Y-%m-%d")
        for i in range(window - 1, -1, -1)
        if (today_date - timedelta(days=i)).strftime("%Y-%m-%d") not in existing_dates
    ]
    if today not in dates:
        dates.append(today)
    return dates


def main() -> None:
    config.validate()

    if not should_run_now():
        log.info(
            "Current hour in %s is not %d:00 — skipping (this run corresponds to the "
            "other UTC cron firing for a different DST offset).",
            config.REPORT_TIMEZONE, config.REPORT_TARGET_HOUR,
        )
        return

    log.info("Logging into Garmin...")
    client = Garmin(config.GARMIN_EMAIL, config.GARMIN_PASSWORD)
    client.login()

    records = storage.load_history()
    existing_dates = {r["date"] for r in records}
    today = datetime.now(ZoneInfo(config.REPORT_TIMEZONE)).strftime("%Y-%m-%d")

    for date_str in dates_to_fetch(existing_dates, today):
        log.info("Fetching %s...", date_str)
        try:
            record = ingest.fetch_day_record(client, date_str)
        except Exception:
            log.exception("Failed to fetch %s — skipping this day", date_str)
            continue
        records = storage.upsert_record(records, record)

    storage.save_history(records)
    log.info("History now has %d day(s).", len(records))

    df = analytics.to_dataframe(records)

    analysis_results = {}
    chart_images = {}
    for cid, analyze, draw in CHART_BUILDERS:
        try:
            result = analyze(df)
        except Exception:
            log.exception("Analysis failed for %s", cid)
            result = None
        analysis_results[cid] = result

        try:
            chart_images[cid] = draw(result)
        except Exception:
            log.exception("Chart rendering failed for %s", cid)
            chart_images[cid] = None

    summary_lines = report.generate_summary(
        df,
        analysis_results["sleep_chart"],
        analysis_results["hrv_chart"],
        analysis_results["mileage_chart"],
        analysis_results["bb_chart"],
    )
    html = report.build_email_html(df, summary_lines, chart_images)

    log.info("Sending email...")
    email_sender.send_report(
        html_body=html,
        chart_images=chart_images,
        subject=f"Health Dashboard — {today}",
        gmail_address=config.GMAIL_ADDRESS,
        gmail_app_password=config.GMAIL_APP_PASSWORD,
        recipient=config.RECIPIENT_EMAIL,
    )
    log.info("Done.")


if __name__ == "__main__":
    main()
