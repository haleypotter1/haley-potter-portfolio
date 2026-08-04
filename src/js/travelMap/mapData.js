import { loadJSON } from '@utils/loadJSON.js';

export async function loadTravelData() {
  return loadJSON(() => import('@data/travel.json'), 'travel');
}

export function locationsForMap(data, mapId) {
  return data.locations.filter((loc) => loc.map === mapId);
}
