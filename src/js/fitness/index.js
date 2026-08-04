import gsap from 'gsap';
import { registerSection } from '../animations/registry.js';
import { staggerReveal, animateCounter } from '../animations/shared.js';
import { getFitnessData } from './dataSource.js';

registerSection('fitness', async (section) => {
  const data = await getFitnessData();
  render(section, data);

  const context = gsap.context(() => {
    staggerReveal(section.querySelectorAll('[data-animate]'), { trigger: section, stagger: 0.08 });
    section.querySelectorAll('[data-counter]').forEach((el) => {
      animateCounter(el, { to: Number(el.dataset.counter), decimals: Number(el.dataset.decimals || 0), trigger: section });
    });
  }, section);

  let chartsLoaded = false;
  let mileageGranularity = 'month';
  let chartsModule = null;

  async function loadCharts() {
    if (chartsLoaded) return;
    chartsLoaded = true;
    chartsModule = await import('./charts.js');
    await renderCharts();
  }

  async function renderCharts() {
    if (!chartsModule) return;
    const canvas = section.querySelector('[data-chart="mileage"]');
    if (canvas) {
      await chartsModule.createMileageChart(canvas, data.activities, {
        granularity: mileageGranularity,
        mileageHistory: data.mileageHistory,
      });
    }
  }

  const observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        loadCharts();
        observer.disconnect();
      }
    },
    { threshold: 0.15 }
  );
  observer.observe(section);

  section.querySelectorAll('[data-mileage-granularity]').forEach((btn) => {
    btn.addEventListener('click', () => {
      section.querySelectorAll('[data-mileage-granularity]').forEach((b) => b.classList.toggle('is-active', b === btn));
      mileageGranularity = btn.dataset.mileageGranularity;
      if (chartsModule) {
        chartsModule.createMileageChart(section.querySelector('[data-chart="mileage"]'), data.activities, {
          granularity: mileageGranularity,
          mileageHistory: data.mileageHistory,
        });
      }
    });
  });

  return () => {
    context.revert();
    observer.disconnect();
    chartsModule?.destroyAllCharts();
  };
});

function render(section, data) {
  const container = section.querySelector('.container');
  const recentRuns = data.activities.slice(0, 5);
  const recentLifts = data.strengthLifts.slice(0, 5);

  container.insertAdjacentHTML(
    'beforeend',
    `
    <div class="fitness-stats" data-animate>
      ${statTile('Year-to-Date', data.summary.totalDistanceMi, ' mi', 1)}
      ${statTile('This Week', data.summary.weeklyMiles, ' mi', 1)}
      ${statTile('Runs Logged', data.summary.runCount, '', 0)}
      ${statTile('Strength Sessions', data.summary.liftCount, '', 0)}
      ${statTile('Strength (YTD)', data.summary.ytdLiftHours, ' hrs', 1)}
    </div>

    <div class="fitness-panels">
      <div class="fitness-panel glass" data-animate>
        <div class="panel-head">
          <h3>Mileage</h3>
          <div class="chart-toggle">
            <button type="button" class="filter-btn" data-mileage-granularity="week">Weekly</button>
            <button type="button" class="filter-btn is-active" data-mileage-granularity="month">Monthly</button>
          </div>
        </div>
        <div class="chart-wrap"><canvas data-chart="mileage"></canvas></div>
      </div>
    </div>

    <div class="fitness-lists">
      <div class="fitness-list glass" data-animate>
        <h3>Recent Runs</h3>
        <ul>
          ${recentRuns.map((r) => `<li><span>${r.date}</span><span>${r.name}</span><span>${r.distanceMi} mi</span></li>`).join('')}
        </ul>
      </div>
      <div class="fitness-list glass" data-animate>
        <h3>Recent Strength Sessions</h3>
        <ul>
          ${recentLifts.map((l) => `<li><span>${l.date}</span><span>${l.name}</span><span>${l.durationMin} min</span></li>`).join('')}
        </ul>
      </div>
    </div>

    <p class="sample-note" data-animate>${syncNote(data.meta.lastSynced)}</p>
  `
  );
}

function syncNote(lastSynced) {
  if (!lastSynced) return 'Synced from Garmin Connect';
  const formatted = new Date(lastSynced).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return `Synced from Garmin Connect · Last updated ${formatted}`;
}

function statTile(label, value, suffix, decimals) {
  return `
    <div class="stat-tile glass">
      <span class="stat-tile__value"><span data-counter="${value}" data-decimals="${decimals}">0</span>${suffix}</span>
      <span class="stat-tile__label">${label}</span>
    </div>
  `;
}
