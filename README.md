# Asteroid Map

**Interactive asteroid impact simulator powered by real NASA data**

[![Live Demo](https://img.shields.io/badge/Live_Demo-asteroidmap.com-orange?style=for-the-badge)](https://asteroidmap.com)
[![Next.js](https://img.shields.io/badge/Next.js_15-black?style=for-the-badge&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](LICENSE)

[**Try it live →**](https://asteroidmap.com)

</div>

---

## What is Asteroid Map?

Asteroid Map lets you drop any space rock on any city and watch what happens. Pick a location on the interactive globe, choose from real near-Earth asteroids pulled live from NASA's database (or famous historical impactors like Chicxulub), and instantly see the scientifically-modelled destruction radius overlaid on the map — crater, fireball, blast wave, and thermal radiation zones — along with estimated casualties and energy release.

The physics are based on [Collins et al. 2005 "Earth Impact Effects Program"](https://doi.org/10.1111/j.1945-5100.2005.tb00159.x) — the same methodology used by planetary scientists.

---

## Features

- **Real asteroid data** — live close-approach objects from NASA's CNEOS API, filtered by size and approach date
- **Famous impactors** — preloaded with Chicxulub, Apophis, Tunguska, Chelyabinsk, and more
- **Four destruction zones** visualised on the map:
  - Crater (total annihilation radius)
  - Fireball (thermal lethality)
  - Blast wave (4 psi — buildings collapse)
  - Thermal radiation (3rd-degree burns)
- **Casualty estimates** based on population density presets (dense urban → rural)
- **Scientific readout** — impact energy in megatons, equivalent seismic magnitude, recurrence interval
- **Shareable URLs** — every simulation state is encoded in the URL so you can share exact scenarios
- **Mobile-friendly** — step-through drawer UI on small screens
- **Customisable impactor** — adjust diameter, velocity, composition (ice / porous rock / dense rock / iron), and impact angle

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
| Asteroid data | NASA CNEOS Close Approach Data API |
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

# 3. Set up environment variables
cp .env.example .env.local
# Then edit .env.local and add your GEMINI_API_KEY
```

### Environment Variables

Create a `.env.local` file in the project root:

```env
# Required — get one free at https://aistudio.google.com/app/apikey
GEMINI_API_KEY=your_gemini_api_key_here

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
│   ├── AsteroidPanel.tsx       # Asteroid selector (known / upcoming / past)
│   ├── SearchPanel.tsx         # Location search
│   ├── StatsPanel.tsx          # Impact results & statistics
│   └── TopNav.tsx              # Navigation tabs
│
└── lib/
    ├── physics.ts              # Impact calculations (crater, blast, thermal, casualties)
    ├── store.ts                # Zustand global state
    ├── known-asteroids.ts      # Preloaded asteroid database
    └── major-cities.ts         # Major city coordinates for quick selection
```

---

## The Science

Impact effects are calculated using the Earth Impact Effects Program (Collins et al. 2005). Key formulas:

- **Crater radius** — scales with impactor kinetic energy and target density
- **Fireball radius** — luminous energy threshold for thermal lethality
- **Blast overpressure** — 4 psi isobar (structural collapse threshold) from Hopf scaling
- **Thermal radiation** — fluence threshold for 3rd-degree burns
- **Casualty estimate** — affected area × population density preset
- **Recurrence interval** — frequency scaling: `10^(1.9 × log₁₀(diameter))` years

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
