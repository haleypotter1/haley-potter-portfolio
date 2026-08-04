import json
import os
from datetime import datetime, timedelta
from garminconnect import Garmin
from dotenv import load_dotenv

load_dotenv()

# ==========================================
# CONFIGURATION
# ==========================================

GARMIN_EMAIL = os.environ.get("GARMIN_EMAIL")
GARMIN_PASSWORD = os.environ.get("GARMIN_PASSWORD")

OUTPUT_FILE = "public/data/activities.json"

RECENT_RUNS_TO_KEEP = 8
RECENT_LIFTS_TO_KEEP = 6
MILEAGE_HISTORY_MONTHS = 12


# ==========================================
# HELPERS
# ==========================================

def miles(meters):
    return round((meters or 0) / 1609.344, 2)


def activity_type(activity):
    return (
        activity.get("activityType", {})
        .get("typeKey", "")
        .lower()
    )


def sanitize_name(name, fallback):
    """Garmin auto-names activities as "<Location> - <Label>" (e.g.
    "Milford - Long Run"), which leaks where the activity happened. Per
    the site's privacy rules (see CLAUDE.md: "the visitor should never be
    able to infer where the user lives, runs, or exercises"), only the
    label after the dash is public-safe."""
    if not name:
        return fallback

    if " - " in name:
        label = name.split(" - ", 1)[1].strip()
        return label or fallback

    return name


def duration_minutes(activity):
    seconds = (
        activity.get("duration")
        or activity.get("durationInSeconds")
        or 0
    )

    return round(seconds / 60, 1)


def parse_date(activity):
    value = activity.get("startTimeLocal")

    if not value:
        return None

    try:
        return datetime.strptime(value, "%Y-%m-%d %H:%M:%S")
    except Exception:
        try:
            return datetime.fromisoformat(
                value.replace("Z", "+00:00")
            )
        except Exception:
            return None


# ==========================================
# FETCH
# ==========================================

def fetch_activities(client):
    # get_activities_by_date paginates internally until the date range is
    # exhausted, so this reliably covers a full year regardless of how
    # many activities that is — unlike get_activities(0, N), which needs a
    # guessed page size and silently truncates if N is too small.
    start_date = (datetime.now() - timedelta(days=MILEAGE_HISTORY_MONTHS * 31 + 7)).strftime("%Y-%m-%d")
    end_date = datetime.now().strftime("%Y-%m-%d")

    try:
        return client.get_activities_by_date(start_date, end_date)
    except Exception as e:
        print(f"Could not download Garmin activities: {e}")
        return []


# ==========================================
# PROCESS
# ==========================================

def build_mileage_history(runs, months=MILEAGE_HISTORY_MONTHS):
    """Aggregate running distance by calendar month for the last `months`
    months (oldest first), including months with zero miles, so the chart
    always has a consistent, full-width set of bars instead of only the
    handful of months that happen to have runs in the recent-runs list."""

    today = datetime.now()

    by_month = {}
    for run in runs:
        by_month[run["date"][:7]] = by_month.get(run["date"][:7], 0) + run["distance_miles"]

    history = []
    for i in range(months - 1, -1, -1):
        year = today.year
        month = today.month - i
        while month <= 0:
            month += 12
            year -= 1
        key = f"{year:04d}-{month:02d}"
        history.append({"month": key, "miles": round(by_month.get(key, 0), 1)})

    return history


def build_summary(activities):

    today = datetime.now()

    week_start = today - timedelta(days=7)

    ytd_miles = 0
    weekly_miles = 0
    ytd_lift_minutes = 0

    runs = []
    lifts = []

    for activity in activities:

        date = parse_date(activity)

        if date is None:
            continue

        type_key = activity_type(activity)

        if "running" in type_key:

            distance = miles(
                activity.get("distance")
                or activity.get("distanceInMeters")
                or 0
            )

            if date.year == today.year:
                ytd_miles += distance

            if date >= week_start:
                weekly_miles += distance

            runs.append(
                {
                    "date": date.strftime("%Y-%m-%d"),
                    "activity": sanitize_name(activity.get("activityName"), "Run"),
                    "distance_miles": distance,
                }
            )

        elif (
            "strength" in type_key
            or "weight" in type_key
        ):

            if date.year == today.year:
                ytd_lift_minutes += duration_minutes(activity)

            lifts.append(
                {
                    "date": date.strftime("%Y-%m-%d"),
                    "activity": sanitize_name(
                        activity.get("activityName"),
                        "Strength Training",
                    ),
                    "duration_minutes": duration_minutes(activity),
                }
            )

    runs.sort(
        key=lambda x: x["date"],
        reverse=True,
    )

    lifts.sort(
        key=lambda x: x["date"],
        reverse=True,
    )

    return {
        "last_updated": datetime.now().isoformat(),

        "stats": {
            "year_to_date_miles": round(ytd_miles, 1),
            "weekly_miles": round(weekly_miles, 1),
            "run_count": len(runs),
            "lift_count": len(lifts),
            "year_to_date_lift_hours": round(ytd_lift_minutes / 60, 1),
        },

        "mileage_history": build_mileage_history(runs),

        "recent_runs": runs[:RECENT_RUNS_TO_KEEP],
        "recent_lifts": lifts[:RECENT_LIFTS_TO_KEEP],
    }


# ==========================================
# MAIN
# ==========================================

def main():

    if not GARMIN_EMAIL or not GARMIN_PASSWORD:
        raise RuntimeError(
            "GARMIN_EMAIL and GARMIN_PASSWORD must be environment variables."
        )

    print("Logging into Garmin...")

    client = Garmin(
        GARMIN_EMAIL,
        GARMIN_PASSWORD,
    )

    try:
        client.login()
    except Exception as e:
        raise RuntimeError(
            f"Garmin login failed: {e}"
        )

    print("Downloading activities...")

    activities = fetch_activities(client)

    print(f"Downloaded {len(activities)} activities.")

    summary = build_summary(activities)

    os.makedirs(
        os.path.dirname(OUTPUT_FILE),
        exist_ok=True,
    )

    with open(
        OUTPUT_FILE,
        "w",
        encoding="utf-8",
    ) as f:
        json.dump(
            summary,
            f,
            indent=4,
        )

    print("Finished.")
    print(json.dumps(summary["stats"], indent=4))


if __name__ == "__main__":
    main()