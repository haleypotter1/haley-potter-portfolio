/**
 * Maps whatever raw shape a data source provides into the fixed schema the
 * rest of the fitness module expects, so no other module needs to know the
 * data's origin. Now fed by the real Garmin pipeline (scripts/garmin_fetch.py
 * -> public/data/activities.json): { last_updated, stats, recent_runs,
 * recent_lifts } instead of the old mock { meta, summary, activities,
 * strengthLifts } shape.
 */
export function normalize(raw) {
  const stats = raw.stats ?? {};

  return {
    meta: { source: 'garmin', lastSynced: raw.last_updated ?? null },
    summary: {
      totalDistanceMi: stats.year_to_date_miles ?? 0,
      weeklyMiles: stats.weekly_miles ?? 0,
      runCount: stats.run_count ?? 0,
      liftCount: stats.lift_count ?? 0,
      ytdLiftHours: stats.year_to_date_lift_hours ?? 0,
    },
    mileageHistory: (raw.mileage_history ?? []).map((m) => ({ month: m.month, miles: m.miles })),
    activities: (raw.recent_runs ?? []).map((r) => ({
      date: r.date,
      type: 'run',
      name: sanitizeName(r.activity, 'Run'),
      distanceMi: r.distance_miles,
    })),
    strengthLifts: (raw.recent_lifts ?? []).map((l) => ({
      date: l.date,
      name: sanitizeName(l.activity, 'Strength Training'),
      durationMin: l.duration_minutes,
    })),
  };
}

/**
 * Garmin auto-names activities as "<Location> - <Label>" (e.g. "Milford -
 * Long Run"), which leaks where the activity happened. The fetch script
 * already strips this server-side, but the site never displays a raw
 * Garmin name without going through this too — the privacy rule ("the
 * visitor should never be able to infer where the user lives, runs, or
 * exercises") holds even if activities.json is ever regenerated without
 * that fix.
 */
function sanitizeName(name, fallback) {
  if (!name) return fallback;
  const dashIndex = name.indexOf(' - ');
  if (dashIndex === -1) return name;
  const label = name.slice(dashIndex + 3).trim();
  return label || fallback;
}
