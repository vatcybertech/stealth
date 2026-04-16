# Vermillion Axis Technologies — Marketing Site

## Project
Premium software development firm marketing site. Static Next.js site deployed to GitHub Pages.

## Architecture
- **Framework**: Next.js 14 with static export (`output: 'export'`)
- **Styling**: Tailwind CSS with custom theme tokens
- **Animation**: Framer Motion
- **Icons**: Lucide React
- **Language**: TypeScript
- **Source**: `vermillion-site/src/`

## Directory Structure
```
vermillion-site/src/
  app/          — Next.js app router (layout, page, globals.css)
  components/   — All page sections and UI components
  lib/          — Utility functions and shared config
```

## Components
Navigation, Hero, Stats, Showcase, Services, Features, Comparison, Process, Testimonials, FAQ, CTA (with ContactForm), Footer, DeviceMockup, MagneticButton, CursorSpotlight, ScrollProgress

## Theme
- Dark mode default
- Vermillion accent: `#C03030`
- Fonts: Outfit (headings), Source Sans 3 (body)
- CSS variables defined via Tailwind config (`tailwind.config.ts`)

## Commands
```bash
cd vermillion-site
npm install       # install dependencies
npm run dev       # local dev server
npm run build     # static export to out/
npm run lint      # lint check
```

## Deploy
GitHub Pages via `.github/workflows/static.yml`. Build output is `vermillion-site/out/`.

## Key Patterns
- All components use Framer Motion `whileInView` with `once: true`
- Shared ease curve: `[0.22, 1, 0.36, 1]`
- Theme tokens from `tailwind.config.ts` — never hardcode colors
- Static export only — no server-side features

## Testing
Run `npm run build` and `npm run lint` to validate before deploy.
