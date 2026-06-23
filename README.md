# Maskware — Polymorphic Browser Fingerprinting Protection

> **Maskware doesn't hide. It shapeshifts.**

Advanced anti-fingerprinting extension for Chrome, Firefox, and Safari. Instead of blocking APIs (which is detectable), Maskware presents coherent, per-origin synthetic identities that pass CreepJS, FingerprintJS Pro, and BotD detection.

## Features

| Shield | Default | Protection |
|--------|---------|------------|
| **Hardware** | ✅ | CPU cores, GPU vendor/renderer, screen resolution, DPR, device memory, OS string, battery status, network info, WebGL parameters (50+) |
| **WebRTC** | ✅ | Relay-only ICE policy, strips all local/srflx/prflx candidates, SDP sanitization, `getStats()` IP filtering |
| **Fonts** | ✅ | Canvas `measureText` Perlin noise, `FontFaceSet` enumeration blocked, CSP `font-src 'self'` |
| **Audio/Video** | ✅ | Pink noise audio (-60dB), temporal video noise, fake `enumerateDevices`, no permission prompt |
| **Geolocation** | ✅ | Per-call jitter (~500m), `watchPosition` drift simulation, device-appropriate accuracy |
| **Locale** | ❌ | Full Intl API (DateTimeFormat, NumberFormat, Collator, PluralRules, RelativeTimeFormat, ListFormat), `navigator.language/languages`, Date locale methods |
| **CSS Media** | ✅ | `matchMedia` overrides for prefers-color-scheme, pointer, hover, forced-colors, reduced-motion, etc. |
| **Permissions** | ✅ | Returns `prompt` for sensitive permissions (camera, mic, geo, notifications, etc.) |
| **Plugins** | ✅ | Empty `navigator.plugins`/`mimeTypes`, vendor/product overrides |

## Architecture Highlights

- **ISOLATED world content scripts** — zero prototype pollution, zero main-thread blocking, Safari compatible
- **Single seed script** (~500 bytes) injected in MAIN world via `chrome.scripting` — only bridge, no logic
- **BroadcastChannel** cross-context communication — no DOM attributes, no `runtime.sendMessage`, no localStorage
- **Per-origin profile derivation** — each site sees a deterministically different but coherent identity
- **DNR rules** — Client Hints stripping, STUN/TURN blocking, CSP font-src injection
- **WASM fingerprint generation** — Perlin noise, pink noise, profile hashing (Rust → WebAssembly)
- **Profile migration** — automatic V1→V2 upgrades with consistency preservation

## Quick Start

### Chrome / Edge / Brave

1. `npm install && npm run build`
2. Open `chrome://extensions`, enable **Developer mode**
3. Click **Load unpacked**, select `dist/` folder

### Firefox

1. `about:debugging` → **This Firefox** → **Load Temporary Add-on**
2. Select `manifest.json` from `dist/`

### Safari (Web Extension)

```bash
xcrun safari-web-extension-converter dist/ --project-location ./safari-build
# Open generated Xcode project, sign with Apple Developer ID
```

## Development

```bash
# Install dependencies
npm install

# Development build with watch mode
npm run dev

# Production build
npm run build

# Type checking
npm run typecheck

# Linting
npm run lint

# Unit tests
npm run test:unit

# E2E tests (requires Playwright)
npm run test:e2e

# Full CI check
npm run check
```

## Project Structure

```
maskware/
├── src/
│   ├── background/       # Service worker (profile mgmt, DNR, seed injection)
│   ├── init/seed.ts      # MAIN world bridge (~500 bytes)
│   ├── offscreen/        # Persistent canvas/audio context
│   ├── shields/          # 9 independent shield modules
│   ├── popup/            # Preact UI (identity dashboard, toggles)
│   └── shared/           # Types, crypto, channel, profiles, profile-db
├── wasm/                 # Rust/WASM fingerprint module
├── rules/                # DNR rule sets (JSON)
├── tests/
│   ├── unit/             # Vitest (27 tests)
│   └── e2e/              # Playwright
└── .github/workflows/    # CI/CD
```

## Privacy

- **Zero telemetry** — no analytics, no phoning home
- **Zero cloud dependency** — fully local
- **Open source** — MIT license
- **No web_accessible_resources** — no extension ID exposure
- **No DOM writes** — no detectable attributes

## Target

Passes: **CreepJS**, **FingerprintJS Pro**, **BotD**, **AmIUnique**

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines.

## License

MIT — Free for personal and commercial use.