import { trapFocus } from '@utils/a11y.js';

const SECTION_LABELS = {
  home: 'Home',
  about: 'About',
  timeline: 'Timeline',
  projects: 'Projects',
  leadership: 'Leadership',
  travel: 'Travel',
  resume: 'Resume',
  fitness: 'Off the Clock',
  contact: 'Contact',
};

const SECTION_COMMANDS = Object.entries(SECTION_LABELS).map(([id, label]) => ({
  label: `Go to ${label}`,
  action: () => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }),
}));

const ACTION_COMMANDS = [
  { label: 'Email Haley', action: () => { window.location.href = 'mailto:potterht@mail.uc.edu'; } },
  {
    label: 'Download Resume',
    action: () => {
      const a = document.createElement('a');
      a.href = `${import.meta.env.BASE_URL}resume.pdf`;
      a.download = '';
      a.click();
    },
  },
];

const COMMANDS = [...SECTION_COMMANDS, ...ACTION_COMMANDS];

let els = null;
let releaseFocusTrap = null;
let lastFocused = null;
let activeIndex = 0;
let filtered = COMMANDS;

function build() {
  if (els) return els;

  const overlay = document.createElement('div');
  overlay.className = 'palette-overlay';
  overlay.innerHTML = `
    <div class="palette-panel glass" role="dialog" aria-modal="true" aria-label="Command palette" data-palette-panel>
      <input type="text" class="palette-input" placeholder="Jump to a section or run a command…" data-palette-input aria-label="Search commands" />
      <ul class="palette-list" data-palette-list></ul>
    </div>
  `;
  document.body.appendChild(overlay);

  els = {
    overlay,
    panel: overlay.querySelector('[data-palette-panel]'),
    input: overlay.querySelector('[data-palette-input]'),
    list: overlay.querySelector('[data-palette-list]'),
  };

  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) close();
  });
  els.input.addEventListener('input', () => filter(els.input.value));
  els.input.addEventListener('keydown', handleKeydown);

  return els;
}

function filter(query) {
  const q = query.trim().toLowerCase();
  filtered = q ? COMMANDS.filter((c) => c.label.toLowerCase().includes(q)) : COMMANDS;
  activeIndex = 0;
  renderList();
}

function renderList() {
  els.list.innerHTML =
    filtered
      .map((c, i) => `<li class="palette-item${i === activeIndex ? ' is-active' : ''}" data-index="${i}">${c.label}</li>`)
      .join('') || '<li class="palette-empty">No matching commands</li>';

  Array.from(els.list.children).forEach((li) => {
    if (!li.dataset.index) return;
    li.addEventListener('mouseenter', () => {
      activeIndex = Number(li.dataset.index);
      renderList();
    });
    li.addEventListener('click', runActive);
  });
}

function runActive() {
  const cmd = filtered[activeIndex];
  if (!cmd) return;
  close();
  cmd.action();
}

function handleKeydown(event) {
  if (event.key === 'ArrowDown') {
    event.preventDefault();
    activeIndex = Math.min(activeIndex + 1, filtered.length - 1);
    renderList();
  } else if (event.key === 'ArrowUp') {
    event.preventDefault();
    activeIndex = Math.max(activeIndex - 1, 0);
    renderList();
  } else if (event.key === 'Enter') {
    event.preventDefault();
    runActive();
  } else if (event.key === 'Escape') {
    close();
  }
}

function open() {
  const { overlay, input } = build();
  lastFocused = document.activeElement;
  filter('');
  overlay.classList.add('is-open');
  document.body.classList.add('modal-open');
  releaseFocusTrap = trapFocus(els.panel);
  requestAnimationFrame(() => input.focus());
}

function close() {
  if (!els) return;
  els.overlay.classList.remove('is-open');
  document.body.classList.remove('modal-open');
  releaseFocusTrap?.();
  releaseFocusTrap = null;
  lastFocused?.focus();
}

function toggle() {
  if (els?.overlay.classList.contains('is-open')) close();
  else open();
}

export function initCommandPalette() {
  document.addEventListener('keydown', (event) => {
    const isMeta = event.metaKey || event.ctrlKey;
    if (isMeta && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      toggle();
    }
  });

  document.querySelector('[data-palette-trigger]')?.addEventListener('click', toggle);
}
