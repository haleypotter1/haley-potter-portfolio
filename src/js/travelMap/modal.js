import { openModal } from '@utils/modal.js';

export function openLocationModal(loc) {
  openModal(`
    ${loc.category ? `<p class="modal-eyebrow">${loc.category.replace(/-/g, ' ')}</p>` : ''}
    <h3>${loc.name}</h3>
    ${loc.visitedDate ? `<p class="modal-date">${loc.visitedDate}</p>` : ''}
    ${loc.story ? `<p>${loc.story}</p>` : ''}
    ${loc.isSample ? '<p class="sample-note">* Sample data — replace in src/data/travel.json</p>' : ''}
  `);
}
