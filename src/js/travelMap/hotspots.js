import { toViewBoxPoint } from './projection.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Below this zoom scale, locations with a `clusterParent` collapse into
 * their parent's dot (so a tight group of hyper-local hotspots — e.g. a
 * handful of spots a few miles apart within one city — reads as a single
 * marker until the user actually zooms into that area).
 */
export const CLUSTER_REVEAL_SCALE = 4;

export function renderHotspots(svg, locations, { onSelect } = {}) {
  const group = document.createElementNS(SVG_NS, 'g');
  group.setAttribute('class', 'hotspots');

  const childCountByParent = new Map();
  locations.forEach((loc) => {
    if (!loc.clusterParent) return;
    childCountByParent.set(loc.clusterParent, (childCountByParent.get(loc.clusterParent) || 0) + 1);
  });

  locations.forEach((loc, i) => {
    const { x: cx, y: cy } = toViewBoxPoint(svg, loc.position);
    const isClusterChild = Boolean(loc.clusterParent);
    const clusterChildCount = childCountByParent.get(loc.id) || 0;

    const btn = document.createElementNS(SVG_NS, 'g');
    btn.setAttribute('class', isClusterChild ? 'hotspot hotspot--cluster-child' : 'hotspot');
    btn.setAttribute('tabindex', isClusterChild ? '-1' : '0');
    btn.setAttribute('role', 'button');
    btn.setAttribute('aria-label', `${loc.name}${loc.isSample ? ' (sample data)' : ''} — view details`);
    btn.dataset.locationId = loc.id;
    if (isClusterChild) btn.setAttribute('aria-hidden', 'true');

    const glow = document.createElementNS(SVG_NS, 'circle');
    glow.setAttribute('class', 'hotspot__glow');
    glow.setAttribute('cx', cx);
    glow.setAttribute('cy', cy);
    glow.setAttribute('r', 7);
    glow.style.animationDelay = `-${((i * 0.37) % 2.4).toFixed(2)}s`;

    const dot = document.createElementNS(SVG_NS, 'circle');
    dot.setAttribute('class', 'hotspot__dot');
    dot.setAttribute('cx', cx);
    dot.setAttribute('cy', cy);
    dot.setAttribute('r', 4);

    const label = document.createElementNS(SVG_NS, 'text');
    label.setAttribute('class', 'hotspot__label');
    label.setAttribute('x', cx);
    label.setAttribute('y', cy - 12);
    label.setAttribute('text-anchor', 'middle');
    label.textContent = loc.name;

    btn.append(glow, dot, label);

    if (clusterChildCount > 0) {
      const badge = document.createElementNS(SVG_NS, 'text');
      badge.setAttribute('class', 'hotspot__badge');
      badge.setAttribute('x', cx + 9);
      badge.setAttribute('y', cy - 9);
      badge.setAttribute('text-anchor', 'middle');
      badge.textContent = `+${clusterChildCount}`;
      btn.appendChild(badge);
    }

    group.appendChild(btn);

    const select = () => onSelect?.(loc);
    btn.addEventListener('click', select);
    btn.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        select();
      }
    });
  });

  svg.appendChild(group);
  return group;
}

/** Called on every zoom change to collapse/reveal cluster children. */
export function setClusterZoomState(svg, scale) {
  const revealed = scale >= CLUSTER_REVEAL_SCALE;
  svg.querySelectorAll('.hotspot--cluster-child').forEach((el) => {
    el.classList.toggle('is-revealed', revealed);
    el.setAttribute('tabindex', revealed ? '0' : '-1');
    el.setAttribute('aria-hidden', String(!revealed));
  });
  svg.querySelectorAll('.hotspot__badge').forEach((el) => {
    el.classList.toggle('is-hidden', revealed);
  });
}
