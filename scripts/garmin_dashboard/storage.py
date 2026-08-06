"""Historical dataset persistence.

Stored as JSON, not SQLite, on purpose: the only "server" this pipeline has
is a GitHub Actions runner that starts from a fresh checkout every run, so
the dataset's durability comes entirely from being committed back to git
(the same pattern scripts/garmin_fetch.py already uses for activities.json).
A SQLite file is a binary blob that git can't diff or merge — every commit
would rewrite the whole file. A JSON array of daily records diffs cleanly
(one day added = a few new lines) and is trivial to reconcile if two CI runs
ever race. It's loaded into a pandas DataFrame for analysis, so nothing is
lost by not using a real database.
"""

import json
from datetime import datetime, timezone
from pathlib import Path

DATA_PATH = Path(__file__).resolve().parents[2] / "data" / "garmin_history.json"

FIELDS = [
    "date",
    "sleep_score",
    "total_sleep_minutes",
    "deep_sleep_minutes",
    "hrv_status",
    "hrv_value",
    "resting_heart_rate",
    "body_battery_morning",
    "recovery_time_minutes",
    "acute_training_load",
    "training_status",
    "workout_type",
    "workout_name",
    "workout_duration_minutes",
    "running_distance_miles",
    "average_heart_rate",
    "calories",
    "steps",
    "updated_at",
]


def load_history() -> list[dict]:
    if not DATA_PATH.exists():
        return []
    with open(DATA_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def save_history(records: list[dict]) -> None:
    DATA_PATH.parent.mkdir(parents=True, exist_ok=True)
    ordered = sorted(records, key=lambda r: r["date"])
    with open(DATA_PATH, "w", encoding="utf-8") as f:
        json.dump(ordered, f, indent=2)
        f.write("\n")


def upsert_record(records: list[dict], record: dict) -> list[dict]:
    """Insert or replace the record for record['date']. Never touches other days.

    This is what makes the pipeline idempotent — running it twice in one day
    (or backfilling a day that's already present) just refreshes that one
    row instead of appending a duplicate.
    """
    full_record = {field: record.get(field) for field in FIELDS}
    full_record["date"] = record["date"]
    full_record["updated_at"] = datetime.now(timezone.utc).isoformat()

    by_date = {r["date"]: r for r in records}
    by_date[full_record["date"]] = full_record
    return list(by_date.values())
