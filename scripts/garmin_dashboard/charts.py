"""Chart generation. Each function returns PNG bytes (or None if there isn't
enough data yet) for one analysis, ready to be attached to the email as a
Content-ID image.
"""

import io
import logging

import matplotlib

matplotlib.use("Agg")  # headless — no display available on a CI runner

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

from . import analytics

log = logging.getLogger("garmin_dashboard.charts")

# Garmin-inspired: brand blue as the primary series, a muted green for
# "good" signal, warm red-orange for flagged/risk signal.
COLOR_PRIMARY = "#007CC3"
COLOR_ACCENT = "#54B948"
COLOR_WARN = "#E4572E"
COLOR_GRID = "#E5E7EB"
COLOR_TEXT = "#1F2937"

plt.rcParams.update({
    "font.family": "sans-serif",
    "font.size": 9,
    "axes.edgecolor": COLOR_GRID,
    "axes.labelcolor": COLOR_TEXT,
    "text.color": COLOR_TEXT,
    "xtick.color": COLOR_TEXT,
    "ytick.color": COLOR_TEXT,
    "axes.grid": True,
    "grid.color": COLOR_GRID,
    "grid.linewidth": 0.6,
    "figure.facecolor": "white",
    "axes.facecolor": "white",
    "axes.spines.top": False,
    "axes.spines.right": False,
})

MIN_POINTS_FOR_CHART = 3


def _fig_to_png_bytes(fig) -> bytes:
    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=110, bbox_inches="tight")
    plt.close(fig)
    buf.seek(0)
    return buf.read()


def _not_enough_data_chart(title: str) -> bytes:
    fig, ax = plt.subplots(figsize=(9, 2.2))
    ax.axis("off")
    ax.text(
        0.5, 0.5, f"{title}\n\nNot enough data yet — check back after a few more days.",
        ha="center", va="center", fontsize=11, color=COLOR_TEXT,
    )
    return _fig_to_png_bytes(fig)


def sleep_vs_workout_chart(result: dict | None) -> bytes | None:
    title = "Sleep vs Next-Day Workout Performance"
    if result is None:
        return None
    d = result["df"].dropna(subset=["sleep_score", "next_workout_duration"])
    if len(d) < MIN_POINTS_FOR_CHART:
        return _not_enough_data_chart(title)

    fig, axes = plt.subplots(1, 3, figsize=(13.5, 3.6))

    ax = axes[0]
    ax.scatter(d["sleep_score"], d["next_workout_duration"], color=COLOR_PRIMARY, alpha=0.7, s=22)
    if result["trend"] is not None:
        slope, intercept = result["trend"]
        xs = np.linspace(d["sleep_score"].min(), d["sleep_score"].max(), 50)
        ax.plot(xs, slope * xs + intercept, color=COLOR_WARN, linewidth=1.6)
    corr = result["correlation_duration"]
    ax.set_title(f"Sleep score vs next-day workout (r={corr if corr is not None else 'n/a'})")
    ax.set_xlabel("Sleep score")
    ax.set_ylabel("Next-day workout (min)")

    ax = axes[1]
    rolling = result["rolling_corr"].dropna()
    if len(rolling) >= 2:
        ax.plot(result["df"].loc[rolling.index, "date"], rolling, color=COLOR_PRIMARY)
        ax.axhline(0, color=COLOR_GRID, linewidth=1)
        ax.set_ylim(-1, 1)
    else:
        ax.text(0.5, 0.5, "Rolling correlation needs\n10+ days", ha="center", va="center", transform=ax.transAxes)
    ax.set_title("Rolling 30-day correlation")
    ax.set_ylabel("r")
    ax.tick_params(axis="x", rotation=30)

    ax = axes[2]
    bucket_avg = result["bucket_avg"]
    x = np.arange(len(bucket_avg))
    width = 0.35
    ax.bar(x - width / 2, bucket_avg["avg_duration"], width, label="Avg duration (min)", color=COLOR_PRIMARY)
    ax.bar(x + width / 2, bucket_avg["avg_distance"], width, label="Avg distance (mi)", color=COLOR_ACCENT)
    ax.set_xticks(x)
    ax.set_xticklabels(bucket_avg["sleep_bucket"], fontsize=8)
    ax.set_title("Next-day workout by sleep-score bucket")
    ax.legend(fontsize=7, frameon=False)

    fig.suptitle(title, fontsize=12, fontweight="bold")
    fig.tight_layout(rect=[0, 0, 1, 0.90])
    return _fig_to_png_bytes(fig)


def hrv_vs_training_load_chart(result: dict | None) -> bytes | None:
    title = "HRV vs Acute Training Load"
    if result is None:
        return None
    d = result["df"]
    if d["hrv_value"].notna().sum() < MIN_POINTS_FOR_CHART:
        return _not_enough_data_chart(title)

    fig, axes = plt.subplots(1, 2, figsize=(13, 3.8))

    ax = axes[0]
    ax.plot(d["date"], d["hrv_value"], color=COLOR_PRIMARY, alpha=0.35, linewidth=1, label="HRV (nightly)")
    ax.plot(d["date"], d["hrv_7d"], color=COLOR_PRIMARY, linewidth=1.8, label="HRV 7d avg")
    ax.set_ylabel("HRV (ms)", color=COLOR_PRIMARY)
    ax.tick_params(axis="y", labelcolor=COLOR_PRIMARY)
    ax.tick_params(axis="x", rotation=30)

    ax2 = ax.twinx()
    ax2.plot(d["date"], d["atl_7d"], color=COLOR_WARN, linewidth=1.8, label="Training load 7d avg")
    ax2.set_ylabel("Acute training load", color=COLOR_WARN)
    ax2.tick_params(axis="y", labelcolor=COLOR_WARN)
    ax2.grid(False)

    for _, row in d[d["fatigue_flag"]].iterrows():
        ax.axvspan(row["date"], row["date"] + pd.Timedelta(days=1), color=COLOR_WARN, alpha=0.08)

    lines1, labels1 = ax.get_legend_handles_labels()
    lines2, labels2 = ax2.get_legend_handles_labels()
    ax.legend(lines1 + lines2, labels1 + labels2, fontsize=7, frameon=False, loc="upper left")
    ax.set_title("HRV and training load over time (shaded = possible fatigue)")

    ax = axes[1]
    scatter_d = d.dropna(subset=["hrv_value", "acute_training_load"])
    colors = np.where(scatter_d["fatigue_flag"], COLOR_WARN, COLOR_PRIMARY)
    ax.scatter(scatter_d["hrv_value"], scatter_d["acute_training_load"], c=colors, alpha=0.7, s=22)
    ax.set_xlabel("HRV (ms)")
    ax.set_ylabel("Acute training load")
    corr = result["correlation"]
    ax.set_title(f"HRV vs training load (r={corr if corr is not None else 'n/a'})")

    fig.suptitle(title, fontsize=12, fontweight="bold")
    fig.tight_layout(rect=[0, 0, 1, 0.90])
    return _fig_to_png_bytes(fig)


def weekly_mileage_vs_rhr_chart(result: dict | None) -> bytes | None:
    title = "Weekly Mileage vs Resting Heart Rate"
    if result is None:
        return None
    w = result["weekly"].dropna(subset=["weekly_mileage"])
    if len(w) < MIN_POINTS_FOR_CHART:
        return _not_enough_data_chart(title)

    fig, ax = plt.subplots(figsize=(11, 4))
    ax.bar(w["date"], w["weekly_mileage"], color=COLOR_PRIMARY, alpha=0.6, width=5, label="Weekly mileage")
    ax.set_ylabel("Weekly mileage (mi)", color=COLOR_PRIMARY)
    ax.tick_params(axis="y", labelcolor=COLOR_PRIMARY)
    ax.tick_params(axis="x", rotation=30)

    ax2 = ax.twinx()
    ax2.plot(w["date"], w["weekly_avg_rhr"], color=COLOR_WARN, linewidth=2, marker="o", markersize=4, label="Weekly avg RHR")
    ax2.set_ylabel("Resting heart rate (bpm)", color=COLOR_WARN)
    ax2.tick_params(axis="y", labelcolor=COLOR_WARN)
    ax2.grid(False)

    corr = result["correlation"]
    ax.set_title(f"{title} (r={corr if corr is not None else 'n/a'})")

    lines1, labels1 = ax.get_legend_handles_labels()
    lines2, labels2 = ax2.get_legend_handles_labels()
    ax.legend(lines1 + lines2, labels1 + labels2, fontsize=8, frameon=False, loc="upper left")

    fig.tight_layout()
    return _fig_to_png_bytes(fig)


def body_battery_vs_workout_chart(result: dict | None) -> bytes | None:
    title = "Body Battery vs Workout Quality"
    if result is None:
        return None
    d = result["df"].dropna(subset=["body_battery_morning", "workout_duration_minutes"])
    if len(d) < MIN_POINTS_FOR_CHART:
        return _not_enough_data_chart(title)

    fig, axes = plt.subplots(1, 2, figsize=(12, 3.8))

    ax = axes[0]
    ax.scatter(d["body_battery_morning"], d["workout_duration_minutes"], color=COLOR_PRIMARY, alpha=0.7, s=22)
    if result["trend"] is not None:
        slope, intercept = result["trend"]
        xs = np.linspace(d["body_battery_morning"].min(), d["body_battery_morning"].max(), 50)
        ax.plot(xs, slope * xs + intercept, color=COLOR_WARN, linewidth=1.6)
    if result["decline_threshold_bucket"]:
        ax.axvline(
            analytics.BB_BUCKETS[analytics.BB_BUCKET_LABELS.index(result["decline_threshold_bucket"])],
            color=COLOR_WARN, linestyle="--", linewidth=1,
        )
    corr = result["correlation"]
    ax.set_xlabel("Morning body battery")
    ax.set_ylabel("Workout duration (min)")
    ax.set_title(f"Body battery vs workout duration (r={corr if corr is not None else 'n/a'})")

    ax = axes[1]
    bucket_avg = result["bucket_avg"]
    x = np.arange(len(bucket_avg))
    width = 0.35
    ax.bar(x - width / 2, bucket_avg["avg_duration"], width, label="Avg duration (min)", color=COLOR_PRIMARY)
    ax.bar(x + width / 2, bucket_avg["avg_distance"], width, label="Avg distance (mi)", color=COLOR_ACCENT)
    ax.set_xticks(x)
    ax.set_xticklabels(bucket_avg["bb_bucket"], fontsize=8)
    ax.set_title("By body-battery bucket")
    ax.legend(fontsize=7, frameon=False)

    fig.suptitle(title, fontsize=12, fontweight="bold")
    fig.tight_layout(rect=[0, 0, 1, 0.90])
    return _fig_to_png_bytes(fig)
