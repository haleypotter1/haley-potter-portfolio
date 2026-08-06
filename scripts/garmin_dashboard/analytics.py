"""Long-term trend analysis over the full historical dataset.

Every function here takes the whole history (as a DataFrame) and returns a
dict of pre-computed results consumed by charts.py and report.py. Each
analysis degrades gracefully to `None`/empty results when there isn't enough
data yet, rather than raising — a fresh dataset with a handful of days
should still produce an email, just with thinner charts and a summary line
saying so.

Adding a new analysis: write a `something_vs_something(df) -> dict | None`
function here, a matching chart builder in charts.py, and wire both into
run_daily_report.py. Nothing else in the pipeline needs to change.
"""

import numpy as np
import pandas as pd

SLEEP_BUCKETS = [0, 60, 70, 80, 90, 101]
SLEEP_BUCKET_LABELS = ["<60", "60-70", "70-80", "80-90", "90-100"]

BB_BUCKETS = [0, 30, 50, 70, 90, 101]
BB_BUCKET_LABELS = ["<30", "30-50", "50-70", "70-90", "90-100"]

MIN_CORR_POINTS = 3


def to_dataframe(records: list[dict]) -> pd.DataFrame:
    df = pd.DataFrame(records)
    if df.empty:
        return df
    df["date"] = pd.to_datetime(df["date"])
    numeric_cols = [
        "sleep_score", "total_sleep_minutes", "deep_sleep_minutes", "hrv_value",
        "resting_heart_rate", "body_battery_morning", "recovery_time_minutes",
        "acute_training_load", "workout_duration_minutes", "running_distance_miles",
        "average_heart_rate", "calories", "steps",
    ]
    for col in numeric_cols:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")
    return df.sort_values("date").reset_index(drop=True)


def _corr(x: pd.Series, y: pd.Series) -> float | None:
    valid = x.notna() & y.notna()
    if valid.sum() < MIN_CORR_POINTS or x[valid].std() == 0 or y[valid].std() == 0:
        return None
    return round(float(x[valid].corr(y[valid])), 2)


def _trend_line(x: pd.Series, y: pd.Series):
    valid = x.notna() & y.notna()
    if valid.sum() < 2 or x[valid].nunique() < 2:
        return None
    return np.polyfit(x[valid], y[valid], 1)  # (slope, intercept)


def _bucket_labels(series: pd.Series, bins: list[float], labels: list[str]) -> pd.Series:
    return pd.cut(series, bins=bins, labels=labels, include_lowest=True)


def bucket_for_value(value, bins: list[float], labels: list[str]) -> str | None:
    if value is None or pd.isna(value):
        return None
    result = pd.cut([value], bins=bins, labels=labels, include_lowest=True)[0]
    return None if pd.isna(result) else str(result)


def _bucket_averages(df: pd.DataFrame, bucket_col: str, value_cols: dict[str, str]) -> pd.DataFrame:
    agg = {out_name: (in_col, "mean") for out_name, in_col in value_cols.items()}
    agg["n"] = (bucket_col, "count")
    grouped = df.groupby(bucket_col, observed=True).agg(**agg)
    if hasattr(df[bucket_col], "cat"):
        # Passing a bare Index (as `.cat.categories` is) to reindex() clears
        # the result's index name, which would turn `reset_index()` into a
        # column literally called "index" instead of `bucket_col`.
        grouped = grouped.reindex(list(df[bucket_col].cat.categories))
    return grouped.rename_axis(bucket_col).reset_index()


def sleep_vs_workout(df: pd.DataFrame) -> dict | None:
    if df.empty or "sleep_score" not in df.columns:
        return None

    d = df.copy()
    d["next_workout_duration"] = d["workout_duration_minutes"].shift(-1)
    d["next_running_distance"] = d["running_distance_miles"].shift(-1)
    d["next_calories"] = d["calories"].shift(-1)
    d["sleep_bucket"] = _bucket_labels(d["sleep_score"], SLEEP_BUCKETS, SLEEP_BUCKET_LABELS)

    rolling_corr = (
        d["sleep_score"]
        .rolling(30, min_periods=10)
        .corr(d["next_workout_duration"])
    )

    bucket_avg = _bucket_averages(
        d, "sleep_bucket",
        {"avg_duration": "next_workout_duration", "avg_distance": "next_running_distance"},
    )

    return {
        "df": d,
        "correlation_duration": _corr(d["sleep_score"], d["next_workout_duration"]),
        "correlation_distance": _corr(d["sleep_score"], d["next_running_distance"]),
        "rolling_corr": rolling_corr,
        "bucket_avg": bucket_avg,
        "trend": _trend_line(d["sleep_score"], d["next_workout_duration"]),
        "overall_avg_duration": d["next_workout_duration"].mean(),
    }


def hrv_vs_training_load(df: pd.DataFrame) -> dict | None:
    if df.empty or "hrv_value" not in df.columns:
        return None

    d = df.set_index("date")
    d["hrv_7d"] = d["hrv_value"].rolling("7D", min_periods=3).mean()
    d["hrv_30d"] = d["hrv_value"].rolling("30D", min_periods=10).mean()
    d["atl_7d"] = d["acute_training_load"].rolling("7D", min_periods=3).mean()
    d["atl_30d"] = d["acute_training_load"].rolling("30D", min_periods=10).mean()

    d["hrv_7d_delta"] = d["hrv_7d"].diff(7)
    d["atl_7d_delta"] = d["atl_7d"].diff(7)
    d["fatigue_flag"] = (d["hrv_7d_delta"] < 0) & (d["atl_7d_delta"] > 0)
    d["recovery_flag"] = (d["hrv_7d_delta"] > 0) & (d["atl_7d_delta"] <= 0)

    d = d.reset_index()

    return {
        "df": d,
        "correlation": _corr(d["hrv_value"], d["acute_training_load"]),
        "fatigue_days": d.loc[d["fatigue_flag"], "date"].tolist(),
    }


def weekly_mileage_vs_rhr(df: pd.DataFrame) -> dict | None:
    if df.empty or "running_distance_miles" not in df.columns:
        return None

    d = df.set_index("date")
    weekly = (
        d.resample("W-SUN")
        .agg(
            weekly_mileage=("running_distance_miles", "sum"),
            weekly_avg_rhr=("resting_heart_rate", "mean"),
        )
        .reset_index()
    )
    weekly["mileage_delta"] = weekly["weekly_mileage"].diff()
    weekly["rhr_delta"] = weekly["weekly_avg_rhr"].diff()
    weekly["classification"] = np.select(
        [
            (weekly["mileage_delta"] > 0) & (weekly["rhr_delta"] < 0),
            (weekly["mileage_delta"] > 0) & (weekly["rhr_delta"] > 0),
        ],
        ["improvement", "fatigue_risk"],
        default="neutral",
    )

    return {
        "weekly": weekly,
        "correlation": _corr(weekly["weekly_mileage"], weekly["weekly_avg_rhr"]),
        "trend": _trend_line(weekly["weekly_mileage"], weekly["weekly_avg_rhr"]),
    }


def body_battery_vs_workout(df: pd.DataFrame) -> dict | None:
    if df.empty or "body_battery_morning" not in df.columns:
        return None

    d = df.copy()
    d["bb_bucket"] = _bucket_labels(d["body_battery_morning"], BB_BUCKETS, BB_BUCKET_LABELS)

    bucket_avg = _bucket_averages(
        d, "bb_bucket",
        {"avg_duration": "workout_duration_minutes", "avg_distance": "running_distance_miles"},
    )

    # Threshold = the bucket boundary with the biggest drop in average workout
    # duration moving from a higher bucket to the one below it.
    threshold = None
    durations = bucket_avg.set_index("bb_bucket").reindex(BB_BUCKET_LABELS)["avg_duration"]
    biggest_drop = 0
    for i in range(len(BB_BUCKET_LABELS) - 1, 0, -1):
        hi, lo = durations.iloc[i], durations.iloc[i - 1]
        if pd.notna(hi) and pd.notna(lo) and (hi - lo) > biggest_drop:
            biggest_drop = hi - lo
            threshold = BB_BUCKET_LABELS[i]

    return {
        "df": d,
        "bucket_avg": bucket_avg,
        "correlation": _corr(d["body_battery_morning"], d["workout_duration_minutes"]),
        "trend": _trend_line(d["body_battery_morning"], d["workout_duration_minutes"]),
        "decline_threshold_bucket": threshold,
    }


def consecutive_increase_streak(series: pd.Series) -> int:
    """How many trailing days had a strictly higher value than the day before."""
    values = series.dropna().tolist()
    streak = 0
    for i in range(len(values) - 1, 0, -1):
        if values[i] > values[i - 1]:
            streak += 1
        else:
            break
    return streak
