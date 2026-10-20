# Radio Foxtang · Listen somewhere new

Independently implemented live world-radio explorer, visually inspired by [RoamDial](https://roamdial.com/). Built for `radio.foxtang.com` using **zero frontend npm dependencies**, HTML/CSS/Canvas and **Cloudflare Pages Functions**. The upstream site's code, branding assets, images and data are not copied.

## Features

- Immersive animated particle sky organized by genre, drag/zoom/click to tune into stations.
- Orthographic 3D-style globe with station dots only where coordinates are actually provided.
- Random next station, previous station, play/pause, volume, favorites, station sharing, and last-station persistence.
- Search, bitrate/language filters, Chinese/English, and phone/tablet responsive layout.
- Radio Browser API catalog proxy with mirror failover, short timeout, strict query allowlist, and 30-minute Cloudflare cache.
- Audio plays **directly in the browser** from station HTTPS stream URLs; no audio proxy and **no D1, KV, secrets or Cron**.

## Cloudflare Pages deployment (for Luna)

1. Connect GitHub repository `th2006464/radio.foxtang.com` to **Cloudflare Pages**.
2. Use **no framework preset**, production branch `main`, build command `npm run build`, output directory `dist`.
3. Cloudflare Pages automatically discovers `functions/api/stations.js` at project root and serves `/api/stations`.
4. Bind the custom domain `radio.foxtang.com` to this *new Pages project*. Do **not** change any unrelated Cloudflare projects, routes, DNS or Access policies.
5. Run `npm run check` before merge. Deployment requires **no secrets, database migrations or environment variables**.
6. Verify `/api/stations?limit=5` returns JSON, landing screen loads and both Sky/Earth views work, station playback starts, and favorites persist. Some broadcasters may block browsers or regions; the app falls back to other stations.

> IMPORTANT: `npm run dev` previews the static UI but not the Pages Function. For the complete live API locally: `npm run build && npx wrangler pages dev dist` (Wrangler is an external dev CLI, not a runtime dependency).

## Runtime caveats

- Radio Browser is community-maintained; source availability, format, legal access, and geographic metadata vary. HTTPS or non-HLS stations work in most modern browsers; browser-level autoplay and codec rules still apply.
- If the Pages Function cannot reach Radio Browser, the browser tries public API mirrors directly as a fallback, subject to their CORS policies.
- Favorites, preference and last station are stored only in the current browser's localStorage, not synced across devices.
- Only station URLs with HTTPS are attempted; HTTP streams cannot be played by an HTTPS page without mixed-content problems.
- No invented song metadata, fake audio waveforms, or location lookups. The UI uses decorative animated bars rather than representing them as real audio levels.

## Commands

```bash
npm run dev     # static UI preview on http://localhost:4173
npm run build   # generate dist/
npm run check   # syntax, native Node tests, and build
```

## Globe update

The Earth mode uses a **WebGL2 shader** and a locally bundled NASA Blue Marble Next Generation equirectangular JPEG (`earth.webp`). Earth imagery: NASA Earth Observatory / Reto Stöckli (Blue Marble Next Generation, https://earthobservatory.nasa.gov/features/BlueMarble). The UI renders dots exclusively from Radio Browser-provided `geo_lat` / `geo_long` values and shows the station's published region and country, not invented city labels. If a station omits geographic coordinates, the locate control is disabled. Stations are fetched through a Pages Function (top stations + geolocated random sample); markers are a sample, not a claim to exhaustively map every world broadcaster.

The WebGL2 sphere and Canvas 2D station overlay are separate, and a basic fallback is provided for devices where WebGL2 is unavailable. Smooth camera easing focuses the selected station; the user can also rotate, tilt, zoom, hover for location, or use the ◎ Locate control. Location is only as accurate as the station directory. No D1, KV, credentials, or new Cloudflare resources are needed.
