import gsap from 'gsap';
import { prefersReducedMotion } from '@utils/a11y.js';

export function staggerReveal(targets, { trigger, stagger = 0.08, y = 16, start = 'top 80%' } = {}) {
  const reduced = prefersReducedMotion();

  return gsap.from(targets, {
    opacity: 0,
    y: reduced ? 0 : y,
    scale: reduced ? 1 : 0.98,
    filter: reduced ? 'blur(0px)' : 'blur(6px)',
    duration: reduced ? 0.001 : 0.7,
    ease: 'expo.out',
    stagger: reduced ? 0 : stagger,
    scrollTrigger: trigger
      ? { trigger, start, once: true }
      : undefined,
  });
}

export function animateCounter(el, { to, duration = 1.6, decimals = 0, trigger } = {}) {
  const reduced = prefersReducedMotion();
  const target = to ?? Number(el.dataset.countTo ?? 0);
  const state = { value: 0 };

  return gsap.to(state, {
    value: target,
    duration: reduced ? 0.001 : duration,
    ease: 'power2.out',
    scrollTrigger: trigger ? { trigger, start: 'top 85%', once: true } : undefined,
    onUpdate() {
      el.textContent = decimals
        ? state.value.toFixed(decimals)
        : Math.round(state.value).toLocaleString('en-US');
    },
  });
}

/**
 * Wires up [data-expand-trigger]/[data-expand-panel] disclosure pairs
 * (education/experience timelines, project/travel detail cards) with a
 * smooth GSAP height animation instead of an instant native <details> snap.
 */
export function initExpandable(scope) {
  const triggers = Array.from(scope.querySelectorAll('[data-expand-trigger]'));

  triggers.forEach((trigger) => {
    const panel = document.getElementById(trigger.getAttribute('aria-controls'));
    if (!panel) return;

    gsap.set(panel, { height: 0, overflow: 'hidden' });

    trigger.addEventListener('click', () => {
      const isOpen = trigger.getAttribute('aria-expanded') === 'true';
      trigger.setAttribute('aria-expanded', String(!isOpen));
      trigger.closest('[data-expand-item]')?.classList.toggle('is-open', !isOpen);

      gsap.to(panel, {
        height: isOpen ? 0 : panel.scrollHeight,
        duration: prefersReducedMotion() ? 0.001 : 0.45,
        ease: 'expo.out',
        onComplete() {
          if (!isOpen) gsap.set(panel, { height: 'auto' });
        },
      });
    });
  });
}

/**
 * Shared markup for a horizontal-timeline entry (Education/Experience) —
 * a dot on the line, a connector stub, and a card that CSS alternates
 * above/below the line via :nth-child on the wrapping <li>.
 */
export function renderTimelineItem({ panelId, dates, title, subtitle, hasDetails, detailsHtml, kind }) {
  return `
    <li class="timeline-item${kind ? ` timeline-item--${kind}` : ''}" data-expand-item data-animate>
      <div class="timeline-item__card card glass">
        ${
          hasDetails
            ? `<div class="timeline-item__head">
                <button class="expand-trigger" type="button" data-expand-trigger aria-expanded="false" aria-controls="${panelId}">Details</button>
              </div>`
            : ''
        }
        <p class="timeline-item__dates">${dates}</p>
        <h3>${title}</h3>
        <p class="timeline-item__credential">${subtitle}</p>
        ${hasDetails ? `<div class="timeline-item__panel" id="${panelId}" data-expand-panel>${detailsHtml}</div>` : ''}
      </div>
      <span class="timeline-item__connector" aria-hidden="true"></span>
      <span class="timeline-item__dot" aria-hidden="true"></span>
    </li>
  `;
}

export function magnetic(el, strength = 0.35) {
  if (prefersReducedMotion()) return () => {};

  function handleMove(event) {
    const rect = el.getBoundingClientRect();
    const x = (event.clientX - rect.left - rect.width / 2) * strength;
    const y = (event.clientY - rect.top - rect.height / 2) * strength;
    gsap.to(el, { x, y, duration: 0.3, ease: 'power2.out' });
  }

  function handleLeave() {
    gsap.to(el, { x: 0, y: 0, duration: 0.4, ease: 'power3.out' });
  }

  el.addEventListener('mousemove', handleMove);
  el.addEventListener('mouseleave', handleLeave);

  return () => {
    el.removeEventListener('mousemove', handleMove);
    el.removeEventListener('mouseleave', handleLeave);
  };
}
