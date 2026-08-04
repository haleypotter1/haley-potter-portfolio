const registry = new Map();

export function registerSection(sectionId, initFn) {
  registry.set(sectionId, initFn);
}

export function initRegisteredSections() {
  for (const [sectionId, initFn] of registry) {
    const el = document.getElementById(sectionId);
    if (!el) continue;
    initFn(el);
  }
}
