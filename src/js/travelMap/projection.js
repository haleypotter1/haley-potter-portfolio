/**
 * Hotspot positions are authored as percentages (0-100) against each map
 * SVG's own viewBox — simplified map outlines don't track a true lat/lng
 * projection closely enough to trust runtime math, so percentages are
 * hand-tuned per location instead. `coords` in travel.json is documentation
 * metadata only.
 */
export function toViewBoxPoint(svg, position) {
  const viewBox = svg.viewBox.baseVal;
  return {
    x: viewBox.x + (position.x / 100) * viewBox.width,
    y: viewBox.y + (position.y / 100) * viewBox.height,
  };
}
