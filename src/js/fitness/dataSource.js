import { normalize } from './normalize.js';

/**
 * The entire integration seam. Fetches the file scripts/garmin_fetch.py
 * writes (see CLAUDE.md's Garmin Data Pipeline) — a runtime fetch rather
 * than a build-time import since public/data/activities.json is
 * regenerated on its own schedule (cron/GitHub Actions) independent of
 * site deploys.
 */
export async function getFitnessData() {
  const response = await fetch(`${import.meta.env.BASE_URL}data/activities.json`);
  if (!response.ok) throw new Error(`Failed to load activities.json: ${response.status}`);
  return normalize(await response.json());
}
