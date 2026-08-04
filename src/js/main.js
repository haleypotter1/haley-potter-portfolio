import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { initNavigation } from './navigation.js';
import { initCommandPalette } from './commandPalette.js';
import { initContact } from './contact.js';
import { initRegisteredSections } from './animations/registry.js';
import './animations/hero.js';
import './animations/about.js';
import './animations/timeline.js';
import './travelMap/index.js';
import './animations/projects.js';
import './animations/leadership.js';
import './animations/resume.js';
import './fitness/index.js';

gsap.registerPlugin(ScrollTrigger);

/**
 * Purely cosmetic — fades via CSS transition (not GSAP/rAF) and always
 * removes itself via a setTimeout fallback so it can never get stuck and
 * block the page underneath, even if the tab is backgrounded on load.
 */
function playIntro() {
  const loader = document.querySelector('[data-loader]');
  if (!loader) return;

  const remove = () => loader.remove();
  loader.addEventListener('transitionend', remove, { once: true });
  setTimeout(remove, 1200);
  requestAnimationFrame(() => loader.classList.add('loader--hide'));
}

function init() {
  initNavigation();
  initCommandPalette();
  initContact();
  initRegisteredSections();
  playIntro();
  document.documentElement.classList.add('js-ready');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}