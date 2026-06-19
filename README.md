# Maskware

**Browser anti-fingerprinting toolkit** — spoof hardware, network, and location signals to break browser fingerprinting. Works on Chrome and Firefox (MV3).

## Overview

Maskware intercepts JavaScript API calls at the browser level — before the page can read them — and returns fabricated values. Each signal is independently togglable via the popup dashboard.

| Shield | Default | What it replaces |
|---|---|---|
| **Hardware fingerprint** | ON | CPU cores, GPU vendor/renderer, screen resolution, OS string, device memory, network type (downlink/rtt/type), battery status. Injects pixel-level noise on Canvas `getImageData`/`toDataURL`/`toBlob`, WebGL `readPixels`, and `AudioBuffer`/`AnalyserNode` output. Fresh random profile per page load. |
| **WebRTC IP leak** | ON | Strips `srflx` (STUN-derived) ICE candidates from `createOffer`/`createAnswer` SDP blobs and filters them from `onicecandidate` events, preventing real-IP exposure past a VPN. |
| **Font fingerprinting** | ON | Adds imperceptible sub-pixel noise to `measureText().width` (defeats canvas-based font probing). Blocks `FontFaceSet.check()` and `.load()` from confirming non-standard fonts. |
| **Mic & Camera block** | ON | Intercepts `getUserMedia`/`getDisplayMedia` — lets the real browser permission prompt proceed (honest UX), then returns a synthetic stream: silent audio (AudioContext silence) or solid-black canvas video. The page gets a live `MediaStream` that never contains your real voice or image, even with granted permission. |
| **GPS location** | ON | Returns a random city from 20 major world cities with ±0.01° jitter (~1 km) per page load via `getCurrentPosition`/`watchPosition`. |
| **Timezone & locale** | OFF | Forces `Intl.DateTimeFormat` timezone to UTC, `Date.prototype.getTimezoneOffset` to 0, and `navigator.language`/`languages` to `en-US`. Off by default because it visibly shifts date/time formatting everywhere. |

## Identity Dashboard

The popup displays the current fabricated identity — GPU, CPU cores, OS, screen resolution, and fake city — as seen by the active tab. **Generate New Identity** reloads the tab, producing a fresh random profile (hardware, canvas salts, audio noise, geo location) for the next page load.

## Installation

### Chrome

1. Open `chrome://extensions`
2. Enable **Developer mode** (top-right)
3. Click **Load unpacked**
4. Select the `maskware` folder

### Firefox

1. Open `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on**
3. Select `manifest.json` from the `maskware` folder

> **Note:** Temporary extensions unload on browser restart. For persistent installation on Firefox, submit an unlisted build through [addons.mozilla.org](https://addons.mozilla.org) (signing only, not public), or use Firefox Developer Edition / Nightly with `xpinstall.signatures.required = false` in `about:config`.

## Usage

- Click the Maskware toolbar icon to open the dashboard
- Toggle any shield on or off — changes apply to new page loads
- Click **Generate New Identity** to reload the tab with a fresh fingerprint profile
- The status badge shows **ACTIVE** when at least one shield is enabled

## Design & Limitations

- **WebRTC:** Only `srflx` candidates are stripped. `host` (already mDNS-masked by Firefox) and `relay` (TURN server IP) are preserved so WebRTC apps with TURN fallback (Discord, Meet, Zoom-web) can still connect.
- **Canvas/WebGL:** Only identifying strings (`VENDOR`, `RENDERER`) and pixel readback are altered. Capability values (`MAX_TEXTURE_SIZE`, etc.) are left real to prevent rendering errors in WebGL apps.
- **Fonts:** CSS `@font-face { src: local(...) }` detection happens inside the rendering engine, below JS content script reach. JS-level vectors (`measureText`, `FontFaceSet`) are covered; the `local()` gap is structural, not an oversight.
- **Device enumeration:** `navigator.mediaDevices.enumerateDevices()` is left unmodified — faking device counts/IDs would break device pickers in calling apps. Only the stream *content* is intercepted.
- **`inject-hardware.js` runs in `MAIN` world** at `document_start`, before page scripts execute, so the API overrides are in place before any fingerprinting script can read them.

## Project Structure

```
maskware/
├── manifest.json          # MV3 manifest (Chrome + Firefox)
├── background.js          # Service worker — manages shield registration & state
├── bridge.js              # Isolated-world content script — relays profile to storage
├── popup.html             # Dashboard UI
├── popup.js               # Dashboard logic — toggles, identity card, new-identity button
├── inject-hardware.js     # CPU, GPU, screen, OS, Canvas, WebGL, Audio, Battery, Network
├── inject-webrtc.js       # ICE candidate filtering (STUN srflx removal)
├── inject-fonts.js        # Canvas measureText noise + FontFaceSet blocking
├── inject-av.js           # getUserMedia / getDisplayMedia stream substitution
├── inject-geo.js          # Geolocation spoofing (random city + jitter)
├── inject-locale.js       # Timezone (UTC) & locale (en-US) override
└── icons/                 # Toolbar & store icons (48, 96, 128 px)
```

## License

MIT
