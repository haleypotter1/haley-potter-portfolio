const cache = new Map();

export async function loadJSON(importer, key) {
  if (cache.has(key)) return cache.get(key);
  const module = await importer();
  const data = module.default ?? module;
  cache.set(key, data);
  return data;
}
