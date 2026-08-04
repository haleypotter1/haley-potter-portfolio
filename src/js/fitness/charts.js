let ChartCtor = null;
const instances = new Map();

function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

async function ensureChart() {
  if (!ChartCtor) {
    const mod = await import('chart.js/auto');
    ChartCtor = mod.Chart ?? mod.default;
  }
  return ChartCtor;
}

function baseOptions() {
  const text = cssVar('--color-text-muted');
  const grid = cssVar('--color-border');
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { labels: { color: cssVar('--color-text'), boxWidth: 10, boxHeight: 10 } },
      tooltip: {
        backgroundColor: cssVar('--color-bg-elevated'),
        titleColor: cssVar('--color-text'),
        bodyColor: cssVar('--color-text-muted'),
        borderColor: cssVar('--color-border'),
        borderWidth: 1,
        padding: 10,
        cornerRadius: 8,
      },
    },
    scales: {
      x: { ticks: { color: text }, grid: { color: grid, display: false } },
      y: { ticks: { color: text }, grid: { color: grid } },
    },
  };
}

function destroy(key) {
  instances.get(key)?.destroy();
  instances.delete(key);
}

function weekKey(dateStr) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().slice(0, 10);
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function monthLabel(monthKey) {
  const [year, month] = monthKey.split('-');
  return `${MONTH_LABELS[Number(month) - 1]} '${year.slice(2)}`;
}

export async function createMileageChart(canvas, activities, { granularity = 'week', mileageHistory = [] } = {}) {
  const Chart = await ensureChart();

  let labels;
  let data;

  if (granularity === 'month' && mileageHistory.length) {
    // Pre-aggregated server-side across a full year (see
    // garmin_fetch.py's build_mileage_history) — the small recent-runs
    // list alone only spans a few weeks, nowhere near enough for a
    // 9-12 month view.
    labels = mileageHistory.map((m) => monthLabel(m.month));
    data = mileageHistory.map((m) => m.miles);
  } else {
    const runs = activities.filter((a) => a.type === 'run');
    const buckets = new Map();
    runs.forEach((r) => {
      const key = granularity === 'week' ? weekKey(r.date) : r.date.slice(0, 7);
      buckets.set(key, (buckets.get(key) || 0) + r.distanceMi);
    });
    const keys = Array.from(buckets.keys()).sort().slice(-16);
    labels = keys.map((k) => (granularity === 'week' ? k.slice(5) : monthLabel(k)));
    data = keys.map((k) => Number(buckets.get(k).toFixed(1)));
  }

  destroy('mileage');
  const chart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Miles',
          data,
          backgroundColor: cssVar('--color-green-ink'),
          borderRadius: 4,
          maxBarThickness: 28,
        },
      ],
    },
    options: { ...baseOptions(), plugins: { ...baseOptions().plugins, legend: { display: false } } },
  });
  instances.set('mileage', chart);
  return chart;
}

export function destroyAllCharts() {
  instances.forEach((chart) => chart.destroy());
  instances.clear();
}
