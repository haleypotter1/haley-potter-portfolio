"""Private daily health-trend email — never touches the public website.

Fetches sleep/HRV/stress/body-battery/training-readiness from Garmin Connect,
computes a few trend stats, and emails the numbers to the owner. Distinct from
scripts/garmin_fetch.py, which exports only public-safe activity data to the
website (see CLAUDE.md's privacy rules).
"""

import os
import smtplib
from datetime import datetime, timedelta
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from statistics import mean, pstdev

from dotenv import load_dotenv
from garminconnect import Garmin

load_dotenv()

# ==========================================
# CONFIGURATION
# ==========================================

GARMIN_EMAIL = os.environ.get("GARMIN_EMAIL")
GARMIN_PASSWORD = os.environ.get("GARMIN_PASSWORD")

GMAIL_ADDRESS = os.environ.get("GMAIL_ADDRESS")
GMAIL_APP_PASSWORD = os.environ.get("GMAIL_APP_PASSWORD")
RECIPIENT_EMAIL = os.environ.get("RECIPIENT_EMAIL") or GMAIL_ADDRESS

LOOKBACK_DAYS = 21
WEEKDAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]


# ==========================================
# GARMIN FETCH
# ==========================================

def safe_get(d, *path):
    for key in path:
        if not isinstance(d, dict):
            return None
        d = d.get(key)
    return d


def fetch_day(client, date_str):
    """Pull sleep score, HRV, stress, body battery, and training readiness for one day.

    Each metric is fetched independently and defaults to missing on failure —
    Garmin doesn't backfill every metric for every day (e.g. no watch worn),
    and one missing metric shouldn't drop the whole day from the trend data.
    """
    day = {"date": date_str}

    try:
        sleep = client.get_sleep_data(date_str)
        day["sleep_score"] = safe_get(sleep, "dailySleepDTO", "sleepScores", "overall", "value")
    except Exception as e:
        print(f"  sleep fetch failed for {date_str}: {e}")

    try:
        hrv = client.get_hrv_data(date_str)
        day["hrv_avg"] = safe_get(hrv, "hrvSummary", "lastNightAvg")
    except Exception as e:
        print(f"  hrv fetch failed for {date_str}: {e}")

    try:
        stress = client.get_stress_data(date_str)
        day["stress_avg"] = (stress or {}).get("avgStressLevel")
    except Exception as e:
        print(f"  stress fetch failed for {date_str}: {e}")

    try:
        bb = client.get_body_battery(date_str, date_str)
        entry = bb[0] if isinstance(bb, list) and bb else None
        if entry:
            values = entry.get("bodyBatteryValuesArray") or []
            levels = [
                v[1] for v in values
                if isinstance(v, list) and len(v) > 1 and isinstance(v[1], (int, float))
            ]
            if levels:
                day["bb_max"] = max(levels)
                day["bb_min"] = min(levels)
                day["bb_drain"] = max(levels) - min(levels)
    except Exception as e:
        print(f"  body battery fetch failed for {date_str}: {e}")

    try:
        readiness = client.get_training_readiness(date_str)
        entry = readiness[0] if isinstance(readiness, list) and readiness else readiness
        day["training_readiness"] = (entry or {}).get("score")
    except Exception as e:
        print(f"  training readiness fetch failed for {date_str}: {e}")

    return day


def fetch_history(client, days):
    today = datetime.now().date()
    history = []
    for i in range(days - 1, -1, -1):
        date_str = (today - timedelta(days=i)).strftime("%Y-%m-%d")
        print(f"Fetching {date_str}...")
        history.append(fetch_day(client, date_str))
    return history


# ==========================================
# STATS
# ==========================================

def pearson(xs, ys):
    """Pearson correlation for paired (x, y), skipping any pair with a None."""
    pairs = [(x, y) for x, y in zip(xs, ys) if x is not None and y is not None]
    if len(pairs) < 3:
        return None
    xs, ys = zip(*pairs)
    mx, my = mean(xs), mean(ys)
    sx, sy = pstdev(xs), pstdev(ys)
    if sx == 0 or sy == 0:
        return None
    cov = mean((x - mx) * (y - my) for x, y in zip(xs, ys))
    return round(cov / (sx * sy), 2)


def weekday_averages(history, field):
    buckets = {i: [] for i in range(7)}
    for day in history:
        value = day.get(field)
        if value is None:
            continue
        weekday = datetime.strptime(day["date"], "%Y-%m-%d").weekday()
        buckets[weekday].append(value)
    return {
        WEEKDAY_NAMES[i]: round(mean(vals), 1) if vals else None
        for i, vals in buckets.items()
    }


def compute_stats(history):
    sleep_scores = [d.get("sleep_score") for d in history]
    hrv_avgs = [d.get("hrv_avg") for d in history]
    stress_avgs = [d.get("stress_avg") for d in history]
    bb_drains = [d.get("bb_drain") for d in history]
    readiness = [d.get("training_readiness") for d in history]

    # sleep score on day N vs next-day training readiness (a same-source
    # "next day performance" proxy Garmin already computes for us)
    sleep_vs_next_day_readiness = pearson(sleep_scores[:-1], readiness[1:])

    return {
        "sleep_vs_next_day_readiness_corr": sleep_vs_next_day_readiness,
        "hrv_vs_stress_corr": pearson(hrv_avgs, stress_avgs),
        "avg_body_battery_drain": (
            round(mean(v for v in bb_drains if v is not None), 1)
            if any(v is not None for v in bb_drains) else None
        ),
        "sleep_by_weekday": weekday_averages(history, "sleep_score"),
        "stress_by_weekday": weekday_averages(history, "stress_avg"),
        "body_battery_drain_by_weekday": weekday_averages(history, "bb_drain"),
    }


# ==========================================
# EMAIL
# ==========================================

def build_email_html(history, stats):
    today = history[-1] if history else {}

    def fmt(value, suffix=""):
        return f"{value}{suffix}" if value is not None else "—"

    rows = "".join(
        f"<tr><td>{d['date']}</td><td>{fmt(d.get('sleep_score'))}</td>"
        f"<td>{fmt(d.get('hrv_avg'), ' ms')}</td><td>{fmt(d.get('stress_avg'))}</td>"
        f"<td>{fmt(d.get('bb_drain'))}</td><td>{fmt(d.get('training_readiness'))}</td></tr>"
        for d in reversed(history[-7:])
    )

    return f"""
    <html><body style="font-family: -apple-system, sans-serif; color: #222;">
      <h1>Daily Health Trends — {today.get('date', '')}</h1>

      <h2>Today's snapshot</h2>
      <p>
        Sleep score: <b>{fmt(today.get('sleep_score'))}</b> &nbsp;|&nbsp;
        HRV: <b>{fmt(today.get('hrv_avg'), ' ms')}</b> &nbsp;|&nbsp;
        Avg stress: <b>{fmt(today.get('stress_avg'))}</b> &nbsp;|&nbsp;
        Body battery drain: <b>{fmt(today.get('bb_drain'))}</b> &nbsp;|&nbsp;
        Training readiness: <b>{fmt(today.get('training_readiness'))}</b>
      </p>

      <h2>Trend stats ({LOOKBACK_DAYS}-day window)</h2>
      <ul>
        <li>Sleep score vs next-day training readiness correlation:
            {fmt(stats['sleep_vs_next_day_readiness_corr'])}</li>
        <li>HRV vs stress correlation: {fmt(stats['hrv_vs_stress_corr'])}</li>
        <li>Average daily body battery drain: {fmt(stats['avg_body_battery_drain'])}</li>
      </ul>

      <h2>Day-of-week averages</h2>
      <table cellpadding="6" style="border-collapse: collapse;">
        <tr style="text-align:left; border-bottom: 1px solid #ccc;">
          <th>Day</th><th>Sleep score</th><th>Stress</th><th>BB drain</th>
        </tr>
        {"".join(
            f"<tr><td>{day}</td><td>{fmt(stats['sleep_by_weekday'].get(day))}</td>"
            f"<td>{fmt(stats['stress_by_weekday'].get(day))}</td>"
            f"<td>{fmt(stats['body_battery_drain_by_weekday'].get(day))}</td></tr>"
            for day in WEEKDAY_NAMES
        )}
      </table>

      <h2>Last 7 days</h2>
      <table cellpadding="6" style="border-collapse: collapse;">
        <tr style="text-align:left; border-bottom: 1px solid #ccc;">
          <th>Date</th><th>Sleep</th><th>HRV</th><th>Stress</th><th>BB drain</th><th>Readiness</th>
        </tr>
        {rows}
      </table>
    </body></html>
    """


def send_email(html_body, subject):
    if not GMAIL_ADDRESS or not GMAIL_APP_PASSWORD:
        raise RuntimeError("GMAIL_ADDRESS and GMAIL_APP_PASSWORD must be environment variables.")

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = GMAIL_ADDRESS
    msg["To"] = RECIPIENT_EMAIL
    msg.attach(MIMEText(html_body, "html"))

    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
        server.login(GMAIL_ADDRESS, GMAIL_APP_PASSWORD)
        server.sendmail(GMAIL_ADDRESS, RECIPIENT_EMAIL, msg.as_string())


# ==========================================
# MAIN
# ==========================================

def main():
    if not GARMIN_EMAIL or not GARMIN_PASSWORD:
        raise RuntimeError("GARMIN_EMAIL and GARMIN_PASSWORD must be environment variables.")

    print("Logging into Garmin...")
    client = Garmin(GARMIN_EMAIL, GARMIN_PASSWORD)
    client.login()

    print(f"Fetching last {LOOKBACK_DAYS} days of health data...")
    history = fetch_history(client, LOOKBACK_DAYS)

    print("Computing trend stats...")
    stats = compute_stats(history)
    print(stats)

    print("Sending email...")
    today_str = history[-1]["date"] if history else datetime.now().strftime("%Y-%m-%d")
    html = build_email_html(history, stats)
    send_email(html, subject=f"Health Trends — {today_str}")

    print("Finished.")


if __name__ == "__main__":
    main()
