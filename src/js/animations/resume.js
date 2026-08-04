import gsap from 'gsap';
import { registerSection } from './registry.js';
import { staggerReveal } from './shared.js';

registerSection('resume', async (section) => {
  const context = gsap.context(() => {
    staggerReveal(section.querySelectorAll('[data-animate]'), { trigger: section, stagger: 0.08 });
  }, section);

  await guardResumeEmbed(section);

  return () => context.revert();
});

/**
 * <object data="/resume.pdf"> has no reliable way to detect a missing file
 * on its own — a dev-server (or static host) SPA fallback can serve
 * index.html for the missing path with a 200, which the object then
 * renders as if it were the resume. Check the resource for real first.
 */
async function guardResumeEmbed(section) {
  const embed = section.querySelector('.resume-embed');
  const object = embed?.querySelector('object');
  if (!embed || !object) return;

  try {
    const response = await fetch(object.getAttribute('data'), { method: 'HEAD' });
    const contentType = response.headers.get('content-type') || '';
    if (response.ok && contentType.includes('pdf')) return;
  } catch {
    /* network error — treat as missing below */
  }

  embed.innerHTML = '<div class="card--placeholder">Resume PDF coming soon — add it at <code>public/resume.pdf</code></div>';
}
