import gsap from 'gsap';
import { registerSection } from './registry.js';
import { staggerReveal } from './shared.js';
import { loadJSON } from '@utils/loadJSON.js';
import { openModal } from '@utils/modal.js';

registerSection('leadership', async (section) => {
  const data = await loadJSON(() => import('@data/leadership.json'), 'leadership');
  const container = section.querySelector('.container');

  container.insertAdjacentHTML(
    'beforeend',
    `
    <div class="leadership-grid">
      ${data.items.map((item) => renderCard(item)).join('')}
    </div>
  `
  );

  const cards = Array.from(container.querySelectorAll('.leadership-card'));

  cards.forEach((card) => {
    const open = () => {
      const item = data.items.find((i) => i.id === card.dataset.id);
      if (item) openLeadershipModal(item);
    };
    card.addEventListener('click', open);
    card.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        open();
      }
    });
  });

  const context = gsap.context(() => {
    staggerReveal(section.querySelectorAll('[data-animate]'), { trigger: section, stagger: 0.08 });
    staggerReveal(cards, { trigger: container, stagger: 0.07 });
  }, section);

  return () => context.revert();
});

function renderCard(item) {
  return `
    <article class="leadership-card card glass" data-id="${item.id}" tabindex="0" role="button" aria-label="View details for ${item.title}">
      <p class="timeline-item__dates">${item.date}</p>
      <h3>${item.title}</h3>
      <p class="timeline-item__credential">${item.organization}</p>
      <p class="leadership-card__summary">${item.summary}</p>
    </article>
  `;
}

function openLeadershipModal(item) {
  openModal(`
    <p class="modal-eyebrow">${item.role || ''}</p>
    <h3>${item.title}</h3>
    <p class="modal-date">${item.organization}${item.date ? ` · ${item.date}` : ''}</p>
    <p>${item.summary}</p>
    ${item.highlights?.length ? `<ul class="timeline-item__highlights">${item.highlights.map((h) => `<li>${h}</li>`).join('')}</ul>` : ''}
    ${item.isSample ? '<p class="sample-note">* Sample data — replace in src/data/leadership.json</p>' : ''}
  `);
}
