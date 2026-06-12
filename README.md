# Asteroid Map

**Interactive asteroid impact-effects simulator using NASA/JPL close-approach data**

[![Live Demo](https://img.shields.io/badge/Live_Demo-asteroidmap.com-orange?style=for-the-badge)](https://asteroidmap.com)
[![Next.js](https://img.shields.io/badge/Next.js_15-black?style=for-the-badge&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](LICENSE)

[**Try it live →**](https://asteroidmap.com)

</div>

---

## What is Asteroid Map?

Asteroid Map lets you drop any space rock on any city and explore a first-order impact-effects scenario. Pick a location on the interactive globe, choose from real near-Earth close-approach records pulled live from NASA/JPL's database (or famous historical impactors like Chicxulub), and see modeled effect zones overlaid on the map — crater, fireball, blast wave, window damage, and thermal radiation zones — along with broad uniform-density population exposure ranges and energy release.

The physics use first-order scaling from [Collins et al. 2005 "Earth Impact Effects Program"](https://doi.org/10.1111/j.1945-5100.2005.tb00157.x). These are educational estimates, not emergency forecasts or precise survival predictions.

---

## Features

- **Real asteroid data** — live close-approach objects from NASA/JPL's SBDB Close-Approach Data API, filtered by size and approach date; some diameters are estimated from brightness
- **Famous impactors** — preloaded with Chicxulub, Apophis, Tunguska, Chelyabinsk, and more
- **Five effect zones** visualised on the map:
  - Crater (excavated-ground radius)
  - Fireball (extreme thermal exposure)
  - Blast wave (about 4 psi structural-damage screening)
  - Window damage (low overpressure — broken-glass injury risk)
  - Thermal radiation (3rd-degree burns)
- **Exposure, casualty, and uninjured-survivor ranges** based on explicit uniform-density scenarios, a custom people/km² value, or optional WorldPop ring-population estimates, broadened by mapped-radius uncertainty
- **WorldPop exposure assist** — optional lookup estimates residential population by mapped effect ring using WorldPop 100 m gridded population data
- **Scientific readout** — impact energy in megatons, seismic energy equivalent, modeled event type, approximate global frequency, and uncertainty notes
- **Shareable URLs** — simulation inputs are encoded in the URL so you can share the same scenario
- **Mobile-friendly** — step-through drawer UI on small screens
- **Scenario controls** — choose the impactor, target location, impact angle, target material, and uniform population-density scenario
- **Speed handling** — live CAD v-infinity values are converted to modeled impact-entry speeds with Earth-gravity focusing; close-approach relative speed is only a fallback

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 15](https://nextjs.org) (App Router, server + client components) |
| Language | TypeScript 5 (strict mode) |
| Styling | Tailwind CSS 4 |
| Map | [MapLibre GL](https://maplibre.org) + [React Map GL](https://visgl.github.io/react-map-gl) |
| State | [Zustand](https://zustand-demo.pmnd.rs) |
| Geocoding | OpenStreetMap Nominatim (proxied via API routes) |
| Asteroid data | NASA/JPL SBDB Close-Approach Data API |
| Animations | [Motion](https://motion.dev) |
| Icons | [Lucide React](https://lucide.dev) |

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org) 18.17 or later
- A free [Google AI Studio](https://aistudio.google.com) API key (used for some features)

### Installation

```bash
# 1. Clone the repo
git clone https://github.com/isaachorowitz/asteroid-map.git
cd asteroid-map

# 2. Install dependencies
npm install

# 3. (Optional) Set up environment variables
cp .env.example .env.local
```

### Environment Variables

All optional — the app runs with none set. Create a `.env.local` in the project root to override:

```env
# Optional — identifies your instance to the OSM Nominatim geocoding service
# Replace with your contact info as required by the Nominatim usage policy
NOMINATIM_USER_AGENT=AsteroidMap/1.0 (your@email.com)

# Optional — override the canonical site URL (defaults to http://localhost:3000 in dev)
# NEXT_PUBLIC_SITE_URL=https://asteroidmap.com
```

### Running the App

```bash
npm run dev      # Start dev server at http://localhost:3000
npm run build    # Production build
npm start        # Serve the production build
npm run lint     # Lint with ESLint
npm run test:physics  # Regression checks for impact physics and NASA/JPL CAD parsing
npm run clean    # Clear the Next.js build cache
```

---

## Project Structure

```
├── app/
│   ├── api/
│   │   ├── geocode/reverse/    # Reverse geocoding (lat/lng → place name)
│   │   ├── geocode/search/     # Forward geocoding (place name → coords)
│   │   └── neo/approaches/     # NASA near-Earth object data
│   ├── layout.tsx              # Root layout, metadata, fonts, JSON-LD
│   └── page.tsx                # Main page
│
├── components/
│   ├── DirectoryMap.tsx        # Interactive map with impact zone overlays
│   └── JsonLd.tsx              # Structured metadata
│
└── lib/
    ├── physics.ts              # Impact calculations (airburst, crater, blast, thermal, casualty ranges)
    ├── store.ts                # Zustand global state
    ├── known-asteroids.ts      # Preloaded asteroid database
    └── major-cities.ts         # Major city coordinates for quick selection
```

---

## The Science

Impact effects are calculated with first-order scaling from the Earth Impact Effects Program (Collins et al. 2005). Key formulas:

- **Crater radius** — scales with impactor kinetic energy and target density
- **Fireball radius** — extreme thermal exposure screening from energy-yield scaling
- **Blast overpressure** — about 4 psi structural-damage screening from yield scaling
- **Window damage** — low-overpressure broken-glass injury screening
- **Thermal radiation** — fluence threshold for 3rd-degree burns
- **Exposure, casualty, and survivor range** — modeled ring populations × broad fatality/injury bands, with mapped-radius uncertainty included in the low/high range
- **Recurrence interval** — approximate global frequency from NASA hazard-scale size anchors

Calibration references include the Collins/Melosh/Marcus Earth Impact Effects Program, NASA's Chelyabinsk summary (about 440 kt TNT, 14 miles burst height, windows blown out over about 200 square miles, and over 1,600 mostly broken-glass injuries), NASA/JPL CAD documentation for live close-approach fields, and Glasstone/Dolan-style air-blast scaling for overpressure screening. The app keeps these as broad calibration checks rather than exact guarantees.

### Accuracy limits

This app cannot make exact survival predictions. Real consequences depend on fragment strength, breakup altitude, terrain, weather and visibility, sheltering, building stock, time of day, emergency response, actual target geology/water depth, and actual gridded population distribution. The casualty engine can accept population totals per effect zone, which is the correct shape for raster-derived exposure. The current UI uses a user-selected uniform density scenario, a custom people/km² value, or an optional WorldPop lookup that estimates population separately for the mapped effect rings; it does not yet use LandScan-style day/night population rasters or building-level vulnerability. Low/high ranges expand using the same mapped-radius uncertainty shown in the report. For best exposure inputs, use a local census product or gridded population dataset such as WorldPop 100 m, Kontur Population 400 m H3, or NASA SEDAC GPWv4 1 km. For NASA/JPL objects, casualty ranges are widened with the measured 1-sigma diameter uncertainty when supplied, or with the estimated diameter range when CAD lacks a measured diameter. Airburst handling is approximate and suppresses crater/seismic effects when the object disrupts above the surface. Water targets only adjust crater scaling; tsunami, water depth, and coastal run-up are not modeled. NASA/JPL close-approach records are real flybys, not predicted impacts; when CAD lacks a measured diameter, the app estimates a diameter range from absolute magnitude and an assumed albedo span, then uses the midpoint estimate for the scenario. Diameter-range uncertainty is reflected in the displayed mass and energy ranges because both scale with diameter cubed. For CAD speeds, the modeled impact-entry speed uses v-infinity with Earth-gravity focusing when JPL supplies it; close-approach relative speed is only used as a fallback. When a curated object has a published bulk density, the app uses that value for mass and energy; otherwise it uses the selected material-density bucket.

---

## Contributing

Contributions are welcome! Here's how to get involved:

1. **Fork** the repository and create your branch from `main`
2. **Make your changes** — run `npm run lint` and `npm run build` before submitting
3. **Open a pull request** with a clear description of what you changed and why

### Good First Issues

- Adding more historical impactors to `lib/known-asteroids.ts`
- Improving mobile UX
- Internationalisation (i18n)
- Accessibility improvements
- Unit tests for `lib/physics.ts`

### Reporting Bugs

Open an [issue](https://github.com/isaachorowitz/asteroid-map/issues) and include:
- Steps to reproduce
- Expected vs. actual behaviour
- Browser and OS

---

## Deployment

The app is deployed as a Next.js standalone build. Any platform that supports Node.js works (Vercel, Railway, Fly.io, Docker, etc.).

```bash
npm run build
npm start
```

For containerised deployments, `next.config.ts` is already set to `output: 'standalone'`.

---

## License

MIT — see [LICENSE](LICENSE) for details.

---

<div align="center">

Built with curiosity about things falling from space. Visit [asteroidmap.com](https://asteroidmap.com).

</div>
