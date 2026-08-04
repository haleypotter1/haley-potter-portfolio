import gsap from 'gsap';
import { registerSection } from './registry.js';
import { staggerReveal, animateCounter } from './shared.js';
import { loadJSON } from '@utils/loadJSON.js';

registerSection('about', async (section) => {
  const data = await loadJSON(() => import('@data/about.json'), 'about');
  render(section, data);

  const context = gsap.context(() => {
    staggerReveal(section.querySelectorAll('[data-animate]'), { trigger: section, stagger: 0.08 });
    section.querySelectorAll('[data-counter]').forEach((el) => {
      animateCounter(el, { to: Number(el.dataset.counter), trigger: section });
    });
  }, section);

  return () => context.revert();
});

function render(section, data) {
  const container = section.querySelector('.container');
  const hasSample = data.stats.some((stat) => stat.isSample);

  container.insertAdjacentHTML(
    'beforeend',
    `
    <div class="about-grid">
      <div class="about-bio" data-animate>
        <p>${data.bio}</p>
      </div>
      <div class="about-photo card glass" data-animate>
        ${
          data.photo
            ? `<img src="${data.photo}" alt="Portrait of Haley Potter" loading="lazy" />`
            : `<div class="card--placeholder">Photo coming soon</div>`
        }
      </div>
    </div>
    <div class="stats-grid" data-animate>
      ${data.stats
        .map(
          (stat) => `
        <div class="stat-tile glass">
          <span class="stat-tile__value"><span data-counter="${stat.value}">0</span>${stat.suffix || ''}</span>
          <span class="stat-tile__label">${stat.label}${stat.isSample ? ' *' : ''}</span>
        </div>`
        )
        .join('')}
    </div>
    ${hasSample ? '<p class="sample-note">* Sample data — replace in src/data/about.json</p>' : ''}
  `
  );
}
