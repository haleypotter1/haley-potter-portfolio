# Haley Potter — Portfolio

A premium, narrative-driven personal portfolio built with vanilla HTML/CSS/JS, [Vite](https://vitejs.dev), [GSAP](https://gsap.com) + ScrollTrigger, [Three.js](https://threejs.org), and [Chart.js](https://www.chartjs.org). Organized around five pillars — Engineer, Leader, Explorer, Athlete, Builder — instead of a plain resume layout.

## Getting started

```bash
npm install
npm run dev       # start the dev server at http://localhost:5173
npm run build     # production build to dist/
npm run preview   # preview the production build locally
```

## Updating content

All portfolio content lives in JSON files under `src/data/` — the site can be updated without touching HTML or JS.

| File | Section | Notes |
| --- | --- | --- |
| `about.json` | About | Bio + animated stat tiles. `isSample: true` stats are placeholder — replace with real numbers. |
| `education.json` | Education | Timeline entries with optional `honors[]` that expand on click. |
| `experience.json` | Experience | Timeline entries; `pillar` tags one of `engineer\|leader\|explorer\|athlete\|builder`. |
| `projects.json` | Projects | Filterable project grid. `image: null` renders a gradient placeholder until a real photo is added. |
| `leadership.json` | Leadership | Card grid, same shape as experience. |
| `travel.json` | Travel | Map hotspots. `position.x/y` are **percentages against the map SVG's viewBox** — hand-tune these against `public/maps/us-map.svg` / `world-map.svg`, not `coords` (which is documentation-only lat/lng). `connections[]` lists other location `id`s to draw an animated path to. |
| `fitness.json` | Fitness | Normalized activity schema (see below) — currently mock data. |

Every sample/placeholder record is marked `"isSample": true` and usually prefixed `"[Sample] ..."` in its title — search for `isSample` to find everything that still needs real content.

### Adding real photos

Drop images into `public/images/projects/` or `public/images/travel/` and set the corresponding `image` (projects) or `images[]` (travel) field to the path, e.g. `"/images/projects/my-project.jpg"`.

### Adding your resume

Add a real PDF at `public/resume.pdf`. The Resume section checks for the file at runtime and shows a "coming soon" placeholder if it's missing, so nothing breaks in the meantime.

### Fitness data / future Garmin integration

`src/js/fitness/dataSource.js` is the single integration seam — it currently reads the static `fitness.json` mock data. To wire up a real source (Garmin Connect API, or imported activity files):

1. Replace the body of `getFitnessData()` with a real fetch/import.
2. Map the raw payload into the normalized shape in `src/js/fitness/normalize.js` — nothing else in the app needs to know where the data came from.

**Privacy allowlist:** activity records must only ever carry `id`, `type`, `date`, `distanceMi`, `durationSec`, `isSample`. Never add pace, elevation, heart rate, GPS/route data, or any other Garmin field to `fitness.json` or the data pipeline that feeds it — the site must never be able to reveal where or how hard the user exercises.

## Architecture notes

- **Single page**, anchor-linked sections — no router. Deep content (project/travel detail) uses the shared modal in `src/js/utils/modal.js`.
- **Animation registry** (`src/js/animations/registry.js`): each section owns one `registerSection(id, initFn)` call. `main.js` runs every registered section's init function once its element exists in the DOM.
- **Three.js hero** (`src/js/three/`): dynamically imported and capability-gated (WebGL, `prefers-reduced-motion`, coarse-pointer + small viewport) so it never blocks first paint and degrades to a static gradient when unsupported.
- **Travel map** (`src/js/travelMap/`): hand-rolled SVG hotspots/connections/zoom-pan over the two maps in `public/maps/`. No mapping library.
- **Fitness charts** (`src/js/fitness/charts.js`): Chart.js is dynamically imported only once the Fitness section scrolls into view, and chunked separately by Vite so other visitors never download it.

## Deployment

The site is a static build — deploy `dist/` (after `npm run build`) to Vercel, Netlify, or any static host. No environment variables or backend are required.

## Attribution

- `public/maps/us-map.svg` — Wikimedia Commons, CC0 (public domain).
- `public/maps/world-map.svg` — [flekschas/simple-world-map](https://github.com/flekschas/simple-world-map), CC BY-SA 3.0 (Al MacDonald, Fritz Lekschas).
