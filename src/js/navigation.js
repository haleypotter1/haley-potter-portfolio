import gsap from 'gsap';
import { qs, qsa } from '@utils/dom.js';

export function initNavigation() {
  const nav = qs('.site-nav');
  const progress = qs('[data-scroll-progress]');
  const links = qsa('.nav-links a');
  const menuToggle = qs('[data-menu-toggle]');
  const navLinksEl = qs('.nav-links');

  if (!nav) return;

  const sections = links
    .map((link) => document.querySelector(link.getAttribute('href')))
    .filter(Boolean);

  function onScroll() {
    const doc = document.documentElement;
    const scrollTop = doc.scrollTop;
    const scrollHeight = doc.scrollHeight - doc.clientHeight;
    const ratio = scrollHeight > 0 ? scrollTop / scrollHeight : 0;

    nav.classList.toggle('is-scrolled', scrollTop > 40);
    if (progress) gsap.set(progress, { scaleX: ratio });
  }

  const activeObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const id = entry.target.id;
        links.forEach((link) => {
          link.classList.toggle('is-active', link.getAttribute('href') === `#${id}`);
        });
      });
    },
    { rootMargin: '-45% 0px -50% 0px', threshold: 0 }
  );

  sections.forEach((section) => activeObserver.observe(section));

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  if (menuToggle && navLinksEl) {
    menuToggle.addEventListener('click', () => {
      const isOpen = navLinksEl.classList.toggle('is-open');
      menuToggle.setAttribute('aria-expanded', String(isOpen));
    });

    links.forEach((link) =>
      link.addEventListener('click', () => {
        navLinksEl.classList.remove('is-open');
        menuToggle.setAttribute('aria-expanded', 'false');
      })
    );
  }
}
