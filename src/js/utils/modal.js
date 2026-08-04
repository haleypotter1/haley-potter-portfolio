import { trapFocus } from './a11y.js';

let modalEl = null;
let releaseFocusTrap = null;
let lastFocused = null;

function ensureModal() {
  if (modalEl) return modalEl;

  modalEl = document.createElement('div');
  modalEl.className = 'modal-overlay';
  modalEl.setAttribute('role', 'dialog');
  modalEl.setAttribute('aria-modal', 'true');
  modalEl.innerHTML = `
    <div class="modal-panel glass" data-modal-panel>
      <button class="modal-close" type="button" data-modal-close aria-label="Close">✕</button>
      <div class="modal-content" data-modal-content></div>
    </div>
  `;
  document.body.appendChild(modalEl);

  modalEl.addEventListener('click', (event) => {
    if (event.target === modalEl) closeModal();
  });
  modalEl.querySelector('[data-modal-close]').addEventListener('click', closeModal);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modalEl.classList.contains('is-open')) closeModal();
  });

  return modalEl;
}

export function openModal(html) {
  const modal = ensureModal();
  modal.querySelector('[data-modal-content]').innerHTML = html;
  lastFocused = document.activeElement;
  modal.classList.add('is-open');
  document.body.classList.add('modal-open');
  releaseFocusTrap = trapFocus(modal.querySelector('[data-modal-panel]'));
  requestAnimationFrame(() => modal.querySelector('[data-modal-close]')?.focus());
}

export function closeModal() {
  if (!modalEl) return;
  modalEl.classList.remove('is-open');
  document.body.classList.remove('modal-open');
  releaseFocusTrap?.();
  releaseFocusTrap = null;
  lastFocused?.focus();
}
