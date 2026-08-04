import gsap from 'gsap';
import { registerSection } from './registry.js';
import { staggerReveal } from './shared.js';
import { loadJSON } from '@utils/loadJSON.js';
import { openModal } from '@utils/modal.js';

const PILLAR_LABELS = {
  engineer: 'Engineer',
  leader: 'Leader',
  explorer: 'Explorer',
  athlete: 'Athlete',
  builder: 'Builder',
};

registerSection('projects', async (section) => {
  const data = await loadJSON(() => import('@data/projects.json'), 'projects');
  const container = section.querySelector('.container');
  const pillars = [...new Set(data.items.map((item) => item.pillar))];

  container.insertAdjacentHTML(
    'beforeend',
    `
    <div class="filter-bar" data-animate>
      <button type="button" class="filter-btn is-active" data-project-filter="all">All</button>
      ${pillars
        .map((p) => `<button type="button" class="filter-btn" data-project-filter="${p}">${PILLAR_LABELS[p] || p}</button>`)
        .join('')}
    </div>
    <div class="projects-grid" data-projects-grid>
      ${data.items.map((item) => renderCard(item)).join('')}
    </div>
  `
  );

  const grid = container.querySelector('[data-projects-grid]');
  const cards = Array.from(grid.querySelectorAll('.project-card'));
  const filterButtons = Array.from(container.querySelectorAll('[data-project-filter]'));

  filterButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      filterButtons.forEach((b) => b.classList.toggle('is-active', b === btn));
      const filter = btn.dataset.projectFilter;
      cards.forEach((card) => {
        const show = filter === 'all' || card.dataset.pillar === filter;
        card.classList.toggle('is-hidden', !show);
      });
      gsap.fromTo(
        cards.filter((c) => !c.classList.contains('is-hidden')),
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.4, stagger: 0.05, ease: 'power2.out' }
      );
    });
  });

  cards.forEach((card) => {
    const open = () => {
      const item = data.items.find((i) => i.id === card.dataset.id);
      if (item) openProjectModal(item);
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
    staggerReveal(cards, { trigger: grid, stagger: 0.06 });
  }, section);

  return () => context.revert();
});

function renderCard(item) {
  return `
    <article class="project-card card glass${item.featured ? ' project-card--featured' : ''}" data-id="${item.id}" data-pillar="${item.pillar}" tabindex="0" role="button" aria-label="View details for ${item.title}">
      <div class="project-card__media card--placeholder">Image coming soon</div>
      ${item.featured ? '<span class="project-card__featured-badge">Featured</span>' : ''}
      <p class="eyebrow">${PILLAR_LABELS[item.pillar] || item.pillar}</p>
      <h3>${item.title}</h3>
      <p class="project-card__tagline">${item.tagline || ''}</p>
      <ul class="tag-list">
        ${item.tags.slice(0, 3).map((t) => `<li class="tag">${t}</li>`).join('')}
      </ul>
    </article>
  `;
}

function openProjectModal(item) {
  openModal(`
    <p class="modal-eyebrow">${PILLAR_LABELS[item.pillar] || item.pillar}${item.date ? ` · ${item.date}` : ''}</p>
    <h3>${item.title}</h3>
    ${item.role ? `<p class="modal-date">${item.role}</p>` : ''}
    <p>${item.description}</p>
    ${item.problem ? `<p><strong>Problem:</strong> ${item.problem}</p>` : ''}
    ${item.solution ? `<p><strong>Solution:</strong> ${item.solution}</p>` : ''}
    ${item.results ? `<p><strong>Results:</strong> ${item.results}</p>` : ''}
    ${item.tags?.length ? `<ul class="tag-list">${item.tags.map((t) => `<li class="tag">${t}</li>`).join('')}</ul>` : ''}
    ${item.isSample ? '<p class="sample-note">* Sample data — replace in src/data/projects.json</p>' : ''}
  `);
}
