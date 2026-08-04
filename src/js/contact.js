import { qs } from '@utils/dom.js';

export function initContact() {
  const form = qs('[data-contact-form]');
  if (!form) return;
  const status = form.querySelector('[data-contact-status]');

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const name = form.name.value.trim();
    const email = form.email.value.trim();
    const message = form.message.value.trim();

    const subject = encodeURIComponent(`Portfolio contact from ${name}`);
    const body = encodeURIComponent(`${message}\n\n— ${name} (${email})`);
    window.location.href = `mailto:potterht@mail.uc.edu?subject=${subject}&body=${body}`;

    if (status) status.textContent = 'Opening your email client…';
  });
}
