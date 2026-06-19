# Maskware

> **Break browser fingerprinting. Own your privacy.**

Maskware is an open-source browser extension that intercepts **6 categories** of browser fingerprinting signals at the JavaScript API level — before any page script can read them — and returns fabricated, randomized values. Every page load gets a fresh identity.

[![Chrome](https://img.shields.io/badge/Chrome-MV3-4285F4?logo=googlechrome&logoColor=white)](https://github.com/Jagganu/maskware)
[![Firefox](https://img.shields.io/badge/Firefox-MV3-FF7139?logo=firefoxbrowser&logoColor=white)](https://github.com/Jagganu/maskware)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen)](https://github.com/Jagganu/maskware/pulls)

---

## Shields

| Shield | Default | What it does |
|---|---|---|
| **Hardware fingerprint** | ✅ ON | Fakes CPU cores, GPU vendor/renderer, screen resolution, OS platform, device memory, network info & battery. Injects noise on Canvas `getImageData`, WebGL `readPixels`, and AudioContext output. |
| **WebRTC IP leak** | ✅ ON | Strips `srflx` (STUN) ICE candidates from SDP & events — prevents your real public IP leaking past a VPN. |
| **Font detection** | ✅ ON | Sub-pixel noise on `measureText().width` + blocks `FontFaceSet.check()`/`.load()` for non-standard fonts. |
| **Mic & Camera** | ✅ ON | Real permission prompt shows (honest UX), then returns a fake stream — silent audio + black video. Page gets a live `MediaStream` with zero real content. `enumerateDevices()` returns generic labels (Camera / Microphone / Speaker). |
| **GPS location** | ✅ ON | Random city from 20 world capitals, jittered ±1 km. Fresh per page load. |
| **Timezone & locale** | ❌ OFF | Forces UTC timezone & `en-US` locale. Off by default (shifts date formatting everywhere). |

---

## Why Maskware?

Browser fingerprinting is the **silent tracker**. Unlike cookies, you can't clear it — your browser's unique hardware/software profile persists across sessions, incognito windows, and VPNs. Companies, ad networks, and fraud detectors use fingerprints to identify you even when every cookie is blocked.

Maskware breaks that by **lying to every fingerprinting API on the page** — consistently, at the engine level, before any script can read the truth.

---

## Demo

Open the popup and see your current fake identity — GPU, CPU cores, OS, screen, and geo location — exactly as the active tab sees it. Click **Generate New Identity** to reload with a fresh profile.

---

## Installation

### 1. Set the right manifest

```powershell
.\build.ps1 -Browser chrome   # Chrome / Edge / Brave
.\build.ps1 -Browser firefox  # Firefox
```

### 2. Load the extension

**Chrome / Edge / Brave:** `chrome://extensions` → Developer mode → **Load unpacked** → select folder

**Firefox:** `about:debugging#/runtime/this-firefox` → **Load Temporary Add-on** → select `manifest.json`

> Temporary extensions unload on browser restart. For persistent Firefox install, submit an **unlisted** build at [addons.mozilla.org](https://addons.mozilla.org) or use Firefox Developer/Nightly with `xpinstall.signatures.required = false`.

---

## Usage

1. Click the toolbar icon to open the dashboard
2. Toggle shields on/off — changes apply on next page load
3. Click **Generate New Identity** for a fresh fingerprint
4. Green **ACTIVE** badge = shields are working

---

## Architecture

```
document_start (MAIN world)         document_idle (ISOLATED world)
┌──────────────────────┐           ┌──────────────────────┐
│  inject-hardware.js   │  DOM     │     bridge.js        │
│  inject-webrtc.js     │ ──────►  │  reads profile from  │
│  inject-fonts.js      │ data-*   │  DOM attributes &    │
│  inject-av.js         │          │  sends to background │
│  inject-geo.js        │          └──────────┬───────────┘
│  inject-locale.js     │                     │
└──────────────────────┘                     │ runtime.sendMessage
                                             ▼
                                     ┌──────────────────┐
                                     │  background.js   │
                                     │ (background page │
                                     │  or svc worker)  │
                                     │ stores profile & │
                                     │ manages shields  │
                                     └────────┬─────────┘
                                              │ storage.local
                                              ▼
                                     ┌──────────────────┐
                                     │   popup.js       │
                                     │ renders identity │
                                     │ dashboard &      │
                                     │ toggle controls  │
                                     └──────────────────┘
```

---

## Project Structure

```
maskware/
├── manifest.chrome.json   Chrome manifest (background.service_worker)
├── manifest.firefox.json  Firefox manifest (background.scripts)
├── manifest.json          Active manifest (copy of chrome or firefox)
├── build.ps1              Switch manifest per browser
├── background.js          Background page / service worker
├── bridge.js              ISOLATED-world content script — relays profile
├── popup.html             Dashboard UI
├── popup.js               Dashboard logic
├── inject-hardware.js     CPU · GPU · Screen · OS · Canvas · WebGL · Audio
├── inject-webrtc.js       ICE srflx candidate stripping
├── inject-fonts.js        measureText noise + FontFaceSet blocking
├── inject-av.js           getUserMedia / getDisplayMedia interception
├── inject-geo.js          Geolocation spoofing
├── inject-locale.js       Timezone & locale override
└── icons/                 Store icons (48, 96, 128 px)
```

---

## Design Notes

| Concern | Approach |
|---|---|
| WebRTC connectivity | Only `srflx` stripped; `host` (mDNS) and `relay` (TURN) preserved — calls still connect |
| WebGL stability | Only VENDOR/RENDERER strings faked; capability values left real to avoid crashes |
| Font detection gap | CSS `@font-face { src: local() }` is engine-level, unreachable from JS — only JS vectors covered |
| enumerateDevices() | Labels replaced with generic names (Camera / Microphone / Speaker) to block device-name fingerprinting. Real `deviceId` / `groupId` preserved so app device pickers still function. |
| `document_start` injection | MAIN-world scripts run before any page JS, so overrides are live before fingerprinters fire |

---

## Contributing

PRs, issues, and feature requests are welcome. If you find this useful, **⭐ star the repo** — it helps others discover it.

---

## License

MIT — free to use, modify, and distribute.
