import gsap from 'gsap';
import { registerSection } from './registry.js';
import { staggerReveal, initExpandable, renderTimelineItem } from './shared.js';
import { loadJSON } from '@utils/loadJSON.js';
import { formatDateRange } from '@utils/formatDate.js';

registerSection('timeline', async (section) => {
  const [education, experience] = await Promise.all([
    loadJSON(() => import('@data/education.json'), 'education'),
    loadJSON(() => import('@data/experience.json'), 'experience'),
  ]);

  const entries = [
    ...education.items.map((item) => ({ startDate: item.startDate, html: renderEducationItem(item) })),
    ...experience.items.map((item) => ({ startDate: item.startDate, html: renderExperienceItem(item) })),
  ].sort((a, b) => (a.startDate < b.startDate ? -1 : 1));

  render(section, entries.map((entry) => entry.html));

  const context = gsap.context(() => {
    staggerReveal(section.querySelectorAll('.timeline-item'), { trigger: section, stagger: 0.1 });
  }, section);
  initExpandable(section);

  return () => context.revert();
});

function render(section, itemsHtml) {
  const container = section.querySelector('.container');

  container.insertAdjacentHTML(
    'beforeend',
    `
    <ol class="timeline">
      ${itemsHtml.join('')}
    </ol>
  `
  );
}

function renderEducationItem(item) {
  const hasDetails = item.honors?.length > 0;

  return renderTimelineItem({
    panelId: `education-panel-${item.id}`,
    dates: formatDateRange(item.startDate, item.endDate, item.current),
    title: item.institution,
    subtitle: item.credential,
    hasDetails,
    detailsHtml: hasDetails
      ? `<ul class="timeline-item__highlights">${item.honors.map((h) => `<li>${h}</li>`).join('')}</ul>`
      : '',
    kind: 'education',
  });
}

function renderExperienceItem(item) {
  const hasHighlights = item.highlights?.length > 0;
  const hasDetails = hasHighlights || item.summary || item.skills?.length > 0;

  const detailsHtml = `
    ${item.summary ? `<p class="timeline-item__summary">${item.summary}</p>` : ''}
    ${
      hasHighlights
        ? `<ul class="timeline-item__highlights">${item.highlights.map((h) => `<li>${h}</li>`).join('')}</ul>`
        : ''
    }
    ${
      item.skills?.length
        ? `<ul class="tag-list">${item.skills.map((s) => `<li class="tag">${s}</li>`).join('')}</ul>`
        : ''
    }
  `;

  return renderTimelineItem({
    panelId: `experience-panel-${item.id}`,
    dates: formatDateRange(item.startDate, item.endDate, item.current),
    title: item.role,
    subtitle: `${item.organization}${item.location ? ` · ${item.location}` : ''}`,
    hasDetails,
    detailsHtml: hasDetails ? detailsHtml : '',
    kind: 'experience',
  });
}
