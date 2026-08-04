import gsap from 'gsap';

export function initZoomPan(viewport, target, { onZoom } = {}) {
  let scale = 1;
  let tx = 0;
  let ty = 0;
  let isDragging = false;
  let last = { x: 0, y: 0 };

  gsap.set(target, { transformOrigin: '50% 50%' });
  const quickX = gsap.quickTo(target, 'x', { duration: 0.3, ease: 'power2.out' });
  const quickY = gsap.quickTo(target, 'y', { duration: 0.3, ease: 'power2.out' });
  // quickTo silently no-ops on the compound 'scale' shorthand in this GSAP
  // version — drive scaleX/scaleY individually instead.
  const quickScaleX = gsap.quickTo(target, 'scaleX', { duration: 0.3, ease: 'power2.out' });
  const quickScaleY = gsap.quickTo(target, 'scaleY', { duration: 0.3, ease: 'power2.out' });
  const quickScale = (value) => {
    quickScaleX(value);
    quickScaleY(value);
  };

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  const MAX_SCALE = 10;

  function panBound() {
    return 260 * (scale - 1) + 20;
  }

  function applyScale(nextScale, pivot) {
    const prevScale = scale;
    scale = clamp(nextScale, 1, MAX_SCALE);

    if (pivot) {
      // Keep the content point under the cursor fixed on screen — without
      // this, zooming always scales from dead center and the user has to
      // separately drag-pan to reach the area they actually want to zoom
      // into (e.g. hovering Cincinnati and scrolling should zoom in on
      // Cincinnati, not the middle of the whole US map).
      const localX = (pivot.x - tx) / prevScale;
      const localY = (pivot.y - ty) / prevScale;
      tx = pivot.x - scale * localX;
      ty = pivot.y - scale * localY;
    }

    quickScale(scale);
    const bound = panBound();
    tx = clamp(tx, -bound, bound);
    ty = clamp(ty, -bound, bound);
    quickX(tx);
    quickY(ty);

    if (scale !== prevScale) onZoom?.(scale);
  }

  function handleWheel(event) {
    // Only hijack the wheel for zoom when a modifier is held — otherwise a
    // plain scroll over the map should keep scrolling the page, not get
    // trapped here (the map is inline content, not a full-viewport widget).
    if (!event.ctrlKey && !event.metaKey) return;
    event.preventDefault();

    const rect = viewport.getBoundingClientRect();
    const pivot = {
      x: event.clientX - rect.left - rect.width / 2,
      y: event.clientY - rect.top - rect.height / 2,
    };
    applyScale(scale - event.deltaY * 0.006, pivot);
  }

  function handlePointerDown(event) {
    isDragging = true;
    last = { x: event.clientX, y: event.clientY };
    viewport.classList.add('is-dragging');
  }

  function handlePointerMove(event) {
    if (!isDragging) return;
    const dx = event.clientX - last.x;
    const dy = event.clientY - last.y;
    last = { x: event.clientX, y: event.clientY };
    const bound = panBound();
    tx = clamp(tx + dx, -bound, bound);
    ty = clamp(ty + dy, -bound, bound);
    quickX(tx);
    quickY(ty);
  }

  function handlePointerUp() {
    isDragging = false;
    viewport.classList.remove('is-dragging');
  }

  function reset() {
    scale = 1;
    tx = 0;
    ty = 0;
    quickX(0);
    quickY(0);
    quickScale(1);
    onZoom?.(scale);
  }

  // Button-driven zoom (no modifier key needed) — zooms toward the
  // viewport's current center.
  function zoomBy(factor) {
    applyScale(scale * factor);
  }

  viewport.addEventListener('wheel', handleWheel, { passive: false });
  viewport.addEventListener('pointerdown', handlePointerDown);
  window.addEventListener('pointermove', handlePointerMove);
  window.addEventListener('pointerup', handlePointerUp);

  return {
    reset,
    zoomBy,
    getScale: () => scale,
    dispose() {
      viewport.removeEventListener('wheel', handleWheel);
      viewport.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    },
  };
}
