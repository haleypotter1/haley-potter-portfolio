import gsap from 'gsap';
import { registerSection } from '../animations/registry.js';
import { staggerReveal } from '../animations/shared.js';
import { loadTravelData, locationsForMap } from './mapData.js';
import { renderHotspots, setClusterZoomState } from './hotspots.js';
import { renderConnections } from './connections.js';
import { initZoomPan } from './zoomPan.js';
import { initMapSwitcher } from './mapSwitcher.js';
import { openLocationModal } from './modal.js';

registerSection('travel', async (section) => {
  const data = await loadTravelData();
  const viewport = section.querySelector('[data-travel-viewport]');
  const mount = section.querySelector('[data-travel-map-mount]');
  if (!viewport || !mount) return () => {};

  let zoomPanController = null;

  async function mountMap(mapId) {
    const svgUrl = `${import.meta.env.BASE_URL}maps/${mapId === 'us' ? 'us-map.svg' : 'world-map.svg'}`;
    const response = await fetch(svgUrl);
    const svgText = await response.text();
    mount.innerHTML = svgText;

    const svg = mount.querySelector('svg');
    if (!svg) return;
    svg.classList.add('travel-map-svg');
    svg.removeAttribute('width');
    svg.removeAttribute('height');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', mapId === 'us' ? 'Map of the United States' : 'World map');

    const locations = locationsForMap(data, mapId);
    renderConnections(svg, locations);
    renderHotspots(svg, locations, { onSelect: openLocationModal });
    setClusterZoomState(svg, 1);

    zoomPanController?.dispose();
    zoomPanController = initZoomPan(viewport, svg, {
      onZoom: (scale) => setClusterZoomState(svg, scale),
    });
  }

  initMapSwitcher(section, (mapId) => mountMap(mapId));
  await mountMap('us');

  section.querySelector('[data-map-zoom-in]')?.addEventListener('click', () => zoomPanController?.zoomBy(1.6));
  section.querySelector('[data-map-zoom-out]')?.addEventListener('click', () => zoomPanController?.zoomBy(1 / 1.6));
  section.querySelector('[data-map-zoom-reset]')?.addEventListener('click', () => zoomPanController?.reset());

  const context = gsap.context(() => {
    staggerReveal(section.querySelectorAll('[data-animate]'), { trigger: section, stagger: 0.1 });
  }, section);

  return () => {
    context.revert();
    zoomPanController?.dispose();
  };
});
