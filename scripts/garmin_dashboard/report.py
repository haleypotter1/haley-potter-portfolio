"""Executive summary text and the full HTML email body."""

import pandas as pd

from . import analytics


def _text(value):
    """Fallback for string fields — pandas NaN is truthy, so `value or '—'` never
    catches missing data; must check isna() explicitly."""
    return "—" if value is None or pd.isna(value) else str(value)


def _fmt(value, suffix="", decimals=0):
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return "—"
    if decimals:
        return f"{value:.{decimals}f}{suffix}"
    return f"{value:.0f}{suffix}"


def generate_summary(df, sleep_result, hrv_result, weekly_result, bb_result) -> list[str]:
    if df.empty:
        return ["No history yet — check back tomorrow once the first day is collected."]

    today = df.iloc[-1]
    lines = []

    if sleep_result is not None and pd.notna(today.get("sleep_score")):
        bucket = analytics.bucket_for_value(
            today["sleep_score"], analytics.SLEEP_BUCKETS, analytics.SLEEP_BUCKET_LABELS
        )
        bucket_avg = sleep_result["bucket_avg"]
        row = bucket_avg.loc[bucket_avg["sleep_bucket"] == bucket]
        overall = sleep_result["overall_avg_duration"]
        if not row.empty and pd.notna(row["avg_duration"].iloc[0]) and pd.notna(overall) and overall:
            pct = round((row["avg_duration"].iloc[0] / overall - 1) * 100)
            direction = "longer" if pct >= 0 else "shorter"
            n = int(row["n"].iloc[0])
            lines.append(
                f"Sleep score was {_fmt(today['sleep_score'])}. Workouts following a sleep score in the "
                f"{bucket} range have averaged {abs(pct)}% {direction} than your overall average "
                f"({n} day{'s' if n != 1 else ''} of history in this range)."
            )

    if hrv_result is not None and pd.notna(today.get("hrv_value")):
        hd = hrv_result["df"]
        latest = hd.iloc[-1]
        if pd.notna(latest.get("hrv_30d")):
            below = latest["hrv_value"] < latest["hrv_30d"]
            streak = analytics.consecutive_increase_streak(df["acute_training_load"])
            if below and streak >= 3:
                lines.append(
                    f"Your HRV ({_fmt(latest['hrv_value'])} ms) is below its 30-day average "
                    f"({_fmt(latest['hrv_30d'])} ms) while acute training load has increased for "
                    f"{streak} consecutive days."
                )
            elif not below:
                lines.append(
                    f"HRV ({_fmt(latest['hrv_value'])} ms) is at or above its 30-day average "
                    f"({_fmt(latest['hrv_30d'])} ms) — recovery looks solid."
                )

    if bb_result is not None and pd.notna(today.get("body_battery_morning")):
        bucket = analytics.bucket_for_value(
            today["body_battery_morning"], analytics.BB_BUCKETS, analytics.BB_BUCKET_LABELS
        )
        bucket_avg = bb_result["bucket_avg"]
        row = bucket_avg.loc[bucket_avg["bb_bucket"] == bucket]
        if not row.empty and pd.notna(row["avg_duration"].iloc[0]):
            n = int(row["n"].iloc[0])
            lines.append(
                f"Morning Body Battery was {_fmt(today['body_battery_morning'])}. On days in the {bucket} "
                f"range, workouts have averaged {_fmt(row['avg_duration'].iloc[0])} minutes "
                f"({n} day{'s' if n != 1 else ''} of history)."
            )

    if weekly_result is not None and len(weekly_result["weekly"].dropna(subset=["weekly_mileage"])) >= 2:
        w = weekly_result["weekly"]
        last = w.iloc[-1]
        if pd.notna(last["mileage_delta"]) and pd.notna(last["rhr_delta"]):
            if last["mileage_delta"] > 0 and last["rhr_delta"] < 0:
                lines.append(
                    "Weekly mileage increased while resting heart rate decreased — a good sign of "
                    "aerobic adaptation."
                )
            elif last["mileage_delta"] > 0 and last["rhr_delta"] > 0:
                lines.append(
                    "Weekly mileage increased alongside resting heart rate — worth watching for "
                    "accumulated fatigue."
                )

    if not lines:
        lines.append("Still building up enough history for meaningful trend callouts — check back soon.")

    return lines


def _summary_html(lines: list[str]) -> str:
    items = "".join(f"<li>{line}</li>" for line in lines)
    return f"<ul class='summary'>{items}</ul>"


def _today_snapshot_html(today: pd.Series) -> str:
    def stat(label, value):
        return (
            f"<div class='stat'><div class='stat-label'>{label}</div>"
            f"<div class='stat-value'>{value}</div></div>"
        )

    cells = [
        stat("Sleep score", _fmt(today.get("sleep_score"))),
        stat("HRV", _fmt(today.get("hrv_value"), " ms")),
        stat("Resting HR", _fmt(today.get("resting_heart_rate"), " bpm")),
        stat("Body battery", _fmt(today.get("body_battery_morning"))),
        stat("Training status", _text(today.get("training_status"))),
        stat("Acute load", _fmt(today.get("acute_training_load"))),
        stat("Steps", _fmt(today.get("steps"))),
        stat("Workout", _text(today.get("workout_name"))),
    ]
    return f"<div class='stat-grid'>{''.join(cells)}</div>"


def _chart_block(cid: str, title: str, chart_images: dict) -> str:
    if not chart_images.get(cid):
        return ""
    return f"""
    <div class="section">
      <h2>{title}</h2>
      <img src="cid:{cid}" alt="{title}" style="width:100%; max-width:900px; border-radius:8px;">
    </div>
    """


def build_email_html(df: pd.DataFrame, summary_lines: list[str], chart_images: dict) -> str:
    today = df.iloc[-1] if not df.empty else pd.Series(dtype=object)
    date_val = today.get("date")
    # `%-d` (no leading zero) isn't portable across platforms — build it manually.
    date_str = (
        f"{date_val.strftime('%A, %B')} {date_val.day}, {date_val.year}"
        if isinstance(date_val, pd.Timestamp) else ""
    )

    return f"""
    <html>
    <head>
    <meta charset="utf-8">
    <style>
      body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              color: #1F2937; background: #F7FAFC; margin: 0; padding: 0; }}
      .container {{ max-width: 920px; margin: 0 auto; padding: 24px; }}
      h1 {{ font-size: 22px; color: #007CC3; margin-bottom: 4px; }}
      .subtitle {{ color: #6B7280; font-size: 13px; margin-bottom: 24px; }}
      h2 {{ font-size: 16px; color: #1F2937; border-bottom: 2px solid #007CC3;
            padding-bottom: 6px; margin-top: 0; }}
      .section {{ background: white; border-radius: 10px; padding: 20px; margin-bottom: 18px;
                  box-shadow: 0 1px 3px rgba(0,0,0,0.06); }}
      .summary {{ margin: 0; padding-left: 18px; line-height: 1.6; }}
      .summary li {{ margin-bottom: 8px; }}
      .stat-grid {{ display: flex; flex-wrap: wrap; gap: 12px; }}
      .stat {{ flex: 1 1 100px; background: #F0F7FC; border-radius: 8px; padding: 10px 12px; }}
      .stat-label {{ font-size: 11px; color: #6B7280; text-transform: uppercase; letter-spacing: 0.04em; }}
      .stat-value {{ font-size: 18px; font-weight: 600; color: #007CC3; margin-top: 2px; }}
      .footer {{ color: #9CA3AF; font-size: 11px; text-align: center; margin-top: 20px; }}
    </style>
    </head>
    <body>
      <div class="container">
        <h1>Daily Health Dashboard</h1>
        <div class="subtitle">{date_str}</div>

        <div class="section">
          <h2>Executive Summary</h2>
          {_summary_html(summary_lines)}
        </div>

        <div class="section">
          <h2>Today's Health Metrics</h2>
          {_today_snapshot_html(today)}
        </div>

        {_chart_block("sleep_chart", "Sleep vs Workout Performance", chart_images)}
        {_chart_block("hrv_chart", "HRV vs Training Load", chart_images)}
        {_chart_block("mileage_chart", "Weekly Mileage vs Resting HR", chart_images)}
        {_chart_block("bb_chart", "Body Battery vs Workout Quality", chart_images)}

        <div class="footer">Generated automatically from {len(df)} day{'s' if len(df) != 1 else ''} of history.</div>
      </div>
    </body>
    </html>
    """
