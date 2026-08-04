export function initMapSwitcher(section, onSwitch) {
  const buttons = Array.from(section.querySelectorAll('[data-map-switch]'));

  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.classList.contains('is-active')) return;
      buttons.forEach((b) => {
        b.classList.toggle('is-active', b === btn);
        b.setAttribute('aria-pressed', String(b === btn));
      });
      onSwitch(btn.dataset.mapSwitch);
    });
  });
}
