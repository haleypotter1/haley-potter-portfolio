"""Fetch one day's worth of Garmin metrics into a flat storage record.

Uses garminconnect's `client.typed` accessors (Pydantic-validated) wherever
one exists — that covers sleep, HRV, body battery, training readiness, daily
stats, and activities. Training status / acute training load has no typed
model in this library version, so it's fetched via the raw endpoint and
parsed defensively: Garmin doesn't publish a stable schema for it, and
community reverse-engineering of the endpoint is the only reference
available. If `acute_training_load` or `training_status` come back empty in
practice, the raw payload is logged so the field path can be corrected.
"""

import logging

log = logging.getLogger("garmin_dashboard.ingest")

# Garmin's numeric training-status codes, as commonly documented by
# community projects reverse-engineering the Connect API. Falls back to the
# raw value (string or number) if it doesn't match one of these.
_TRAINING_STATUS_CODES = {
    0: "NO_STATUS",
    1: "DETRAINING",
    2: "RECOVERY",
    3: "MAINTAINING",
    4: "PRODUCTIVE",
    5: "PEAKING",
    6: "OVERREACHING",
    7: "STRAINED",
    8: "UNPRODUCTIVE",
}

_RUNNING_TYPE_HINT = "running"
METERS_PER_MILE = 1609.344


def _find_first(obj, keys, _seen=None):
    """Recursively search a nested dict/list for the first of `keys` (case-insensitive)."""
    if _seen is None:
        _seen = set()
    obj_id = id(obj)
    if obj_id in _seen:
        return None
    _seen.add(obj_id)

    if isinstance(obj, dict):
        lower_keys = {k.lower(): k for k in obj}
        for key in keys:
            if key.lower() in lower_keys:
                value = obj[lower_keys[key.lower()]]
                if value is not None:
                    return value
        for v in obj.values():
            result = _find_first(v, keys, _seen)
            if result is not None:
                return result
    elif isinstance(obj, list):
        for item in obj:
            result = _find_first(item, keys, _seen)
            if result is not None:
                return result
    return None


def _normalize_training_status(value):
    if value is None:
        return None
    if isinstance(value, bool):
        return str(value)
    if isinstance(value, (int, float)):
        return _TRAINING_STATUS_CODES.get(int(value), str(value))
    return str(value)


def _pick_primary_workout(activities):
    """Pick the day's "main" workout when more than one activity was logged.

    Ranked by Garmin's own training-load score for the activity (the best
    available proxy for "the workout that mattered"), falling back to
    duration when that's missing.
    """
    if not activities:
        return None
    return max(
        activities,
        key=lambda a: (
            a.activity_training_load or 0,
            a.duration or 0,
        ),
    )


def fetch_day_record(client, date_str: str) -> dict:
    record = {"date": date_str}

    try:
        stats = client.typed.get_stats(date_str)
        record["resting_heart_rate"] = stats.resting_heart_rate
        record["steps"] = stats.total_steps
        record["body_battery_morning"] = stats.body_battery_highest_value
    except Exception:
        log.warning("Daily stats fetch failed for %s", date_str, exc_info=True)

    try:
        sleep = client.typed.get_sleep_data(date_str)
        dto = sleep.daily_sleep_dto if sleep else None
        if dto:
            if dto.sleep_time_seconds:
                record["total_sleep_minutes"] = round(dto.sleep_time_seconds / 60, 1)
            if dto.deep_sleep_seconds:
                record["deep_sleep_minutes"] = round(dto.deep_sleep_seconds / 60, 1)
            if dto.sleep_scores and dto.sleep_scores.overall:
                record["sleep_score"] = dto.sleep_scores.overall.value
    except Exception:
        log.warning("Sleep fetch failed for %s", date_str, exc_info=True)

    try:
        hrv = client.typed.get_hrv_data(date_str)
        if hrv and hrv.hrv_summary:
            record["hrv_value"] = hrv.hrv_summary.last_night_avg
            record["hrv_status"] = hrv.hrv_summary.status
    except Exception:
        log.warning("HRV fetch failed for %s", date_str, exc_info=True)

    try:
        readiness_list = client.typed.get_training_readiness(date_str)
        if readiness_list:
            latest = max(readiness_list, key=lambda r: r.timestamp or "")
            record["recovery_time_minutes"] = latest.recovery_time
    except Exception:
        log.warning("Training readiness fetch failed for %s", date_str, exc_info=True)

    try:
        raw_status = client.get_training_status(date_str)
        acute_load = _find_first(
            raw_status, ["dailyTrainingLoadAcute", "acuteTrainingLoad"]
        )
        status_value = _find_first(raw_status, ["trainingStatus"])
        record["acute_training_load"] = acute_load
        record["training_status"] = _normalize_training_status(status_value)
        if acute_load is None:
            log.info(
                "acute_training_load not found for %s — raw payload: %.2000s",
                date_str,
                raw_status,
            )
    except Exception:
        log.warning("Training status fetch failed for %s", date_str, exc_info=True)

    try:
        activities = client.typed.get_activities_by_date(date_str, date_str)

        running_meters = sum(
            (a.distance or 0)
            for a in activities
            if a.activity_type
            and a.activity_type.type_key
            and _RUNNING_TYPE_HINT in a.activity_type.type_key.lower()
        )
        if activities:
            record["running_distance_miles"] = round(running_meters / METERS_PER_MILE, 2)

        primary = _pick_primary_workout(activities)
        if primary:
            record["workout_type"] = (
                primary.activity_type.type_key if primary.activity_type else None
            )
            record["workout_name"] = primary.activity_name
            if primary.duration:
                record["workout_duration_minutes"] = round(primary.duration / 60, 1)
            if primary.average_hr:
                record["average_heart_rate"] = round(primary.average_hr)
            if primary.calories:
                record["calories"] = round(primary.calories)
    except Exception:
        log.warning("Activities fetch failed for %s", date_str, exc_info=True)

    return record
