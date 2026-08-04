import gsap from 'gsap';
import { registerSection } from './registry.js';
import { staggerReveal, magnetic } from './shared.js';
import { canRunHeroScene } from '../three/capabilities.js';

registerSection('home', (section) => {
  const cleanupFns = [];

  const context = gsap.context(() => {
    staggerReveal(section.querySelectorAll('[data-animate]'), { stagger: 0.12 });
  }, section);
  cleanupFns.push(() => context.revert());

  section.querySelectorAll('[data-magnetic]').forEach((el) => {
    cleanupFns.push(magnetic(el));
  });

  cleanupFns.push(initHeroScene(section));

  return () => cleanupFns.forEach((fn) => fn && fn());
});

function initHeroScene(section) {
  const canvas = section.querySelector('[data-hero-canvas]');
  if (!canvas || !canRunHeroScene()) return () => {};

  let controller = null;
  let observer = null;
  let disposed = false;

  const schedule = window.requestIdleCallback || ((cb) => setTimeout(cb, 200));
  const cancelSchedule = window.cancelIdleCallback || clearTimeout;

  function handleVisibility() {
    if (!controller) return;
    if (document.visibilityState === 'visible') controller.start();
    else controller.stop();
  }

  const idleId = schedule(async () => {
    if (disposed) return;
    const { createHeroScene } = await import('../three/heroScene.js');
    if (disposed) return;

    controller = createHeroScene(canvas);
    canvas.classList.add('is-active');

    observer = new IntersectionObserver(
      ([entry]) => {
        if (!controller) return;
        if (entry.isIntersecting && document.visibilityState === 'visible') {
          controller.start();
        } else {
          controller.stop();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(section);

    document.addEventListener('visibilitychange', handleVisibility);
  });

  return () => {
    disposed = true;
    cancelSchedule(idleId);
    if (observer) observer.disconnect();
    document.removeEventListener('visibilitychange', handleVisibility);
    if (controller) controller.dispose();
  };
}
