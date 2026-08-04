export function canRunHeroScene() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;

  const isCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
  const isSmallViewport = window.innerWidth < 600;
  if (isCoarsePointer && isSmallViewport) return false;

  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    return !!gl;
  } catch {
    return false;
  }
}
