import gsap from 'gsap';
import { toViewBoxPoint } from './projection.js';
import { prefersReducedMotion } from '@utils/a11y.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Perpendicular offset from the midpoint (not a y-only offset — that
 * degenerates to a straight line whenever p1 and p2 share an x-coordinate,
 * e.g. near-vertical connections). Bulge always points screen-up for a
 * consistent "flight path" look.
 */
function arcControlPoint(p1, p2) {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const dist = Math.hypot(dx, dy) || 1;
  let px = -dy / dist;
  let py = dx / dist;
  if (py > 0) {
    px = -px;
    py = -py;
  }
  const bulge = dist * 0.18;
  return {
    x: (p1.x + p2.x) / 2 + px * bulge,
    y: (p1.y + p2.y) / 2 + py * bulge,
  };
}

export function renderConnections(svg, locations) {
  const byId = new Map(locations.map((loc) => [loc.id, loc]));
  const group = document.createElementNS(SVG_NS, 'g');
  group.setAttribute('class', 'connections');

  const seen = new Set();

  locations.forEach((loc) => {
    (loc.connections || []).forEach((targetId) => {
      const target = byId.get(targetId);
      if (!target) return;
      const key = [loc.id, targetId].sort().join('::');
      if (seen.has(key)) return;
      seen.add(key);

      const p1 = toViewBoxPoint(svg, loc.position);
      const p2 = toViewBoxPoint(svg, target.position);
      const { x: mx, y: my } = arcControlPoint(p1, p2);

      const path = document.createElementNS(SVG_NS, 'path');
      path.setAttribute('class', 'connection-path');
      path.setAttribute('d', `M ${p1.x} ${p1.y} Q ${mx} ${my} ${p2.x} ${p2.y}`);
      group.appendChild(path);
    });
  });

  const existingHotspots = svg.querySelector('.hotspots');
  svg.insertBefore(group, existingHotspots || null);

  requestAnimationFrame(() => {
    const reduced = prefersReducedMotion();
    group.querySelectorAll('.connection-path').forEach((path, i) => {
      const length = path.getTotalLength();
      path.style.strokeDasharray = String(length);
      path.style.strokeDashoffset = reduced ? '0' : String(length);

      if (!reduced) {
        gsap.to(path, {
          strokeDashoffset: 0,
          duration: 1.2,
          delay: i * 0.15,
          ease: 'power2.inOut',
        });
      }
    });
  });

  return group;
}
