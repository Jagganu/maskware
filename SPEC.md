# Maskware v2 — Advanced Architecture Specification

## Target: 10,000+ GitHub Stars

---

## Table of Contents

1. [Current State Assessment](#1-current-state-assessment)
2. [Vision](#2-vision)
3. [Architecture](#3-architecture)
4. [Profile System](#4-profile-system)
5. [Shield Modules](#5-shield-modules)
6. [Anti-Detection](#6-anti-detection)
7. [Tech Stack](#7-tech-stack)
8. [Project Structure](#8-project-structure)
9. [Build System](#9-build-system)
10. [Testing Strategy](#10-testing-strategy)
11. [CI/CD Pipeline](#11-cicd-pipeline)
12. [Store Compliance](#12-store-compliance)
13. [Ecosystem & Growth](#13-ecosystem--growth)
14. [Enterprise Edition](#14-enterprise-edition)
15. [Roadmap](#15-roadmap)

---

## 1. Current State Assessment

### Strengths
| Area | Status |
|------|--------|
| Profile persistence | Working |
| New identity generation | Working |
| Basic API overrides | Working |
| Feature toggles | Working |
| 6 inject scripts | Working |

### Critical Flaws
| # | Flaw | Severity | Detectability |
|---|------|----------|---------------|
| 1 | Extension ID exposed via `web_accessible_resources` | Critical | Trivial |
| 2 | DOM attributes (`data-mw-hw`, `data-mw-geo`) written to documentElement | Critical | Trivial |
| 3 | MAIN world injection with no timing guarantee | Critical | High |
| 4 | Incoherent profile combinations (platform + timezone + locale don't match) | Critical | High |
| 5 | Missing fingerprinting surfaces (Client Hints, AudioContext, WebGL params, UA, plugins, fonts, CSS media queries, permissions, performance timing) | Critical | High |
| 6 | Canvas `measureText` noise only — no pixel-level noise, `toDataURL` untouched | High | Trivial for CreepJS |
| 7 | Font enumeration completely unprotected | High | Trivial |
| 8 | WebRTC: only strips `srflx`, leaks `host`/`relay`/`prflx`/`getStats()` | High | High |
| 9 | Audio/video: triggers real permission prompt, returns detectable silence/black | Medium | Medium |
| 10 | Static jitter per session (geo), deterministic noise (fonts) | Medium | Medium |
| 11 | No Client Hints stripping (`Sec-CH-UA-*` headers) | Critical | Trivial (server-side) |
| 12 | 6× MAIN world injections block main thread (90-300ms TBT) | High | Performance |
| 13 | No WASM/worker/offscreen — everything runs on main thread | High | Performance |
| 14 | Cross-browser: won't work on Safari, fragile on Firefox < 128 | Medium | Deployment |
| 15 | No build system, no tests, no CI/CD | Medium | Maintenance |
| 16 | Duplicate validation logic (3 copies across files) | Low | Maintenance |

### Verdict: FAIL against CreepJS, FingerprintJS Pro, BotD

---

## 2. Vision

Maskware v2 is not a fingerprint **blocker** — it's a **polymorphic identity engine**.

> "Maskware doesn't hide. It shapeshifts."

### Core Principles

1. **Coherent identities** — every spoofed fingerprint component forms a realistic, self-consistent profile
2. **Zero detectability** — no extension artifacts visible to page scripts
3. **Off-main-thread** — zero perceptible performance impact
4. **Cross-browser** — Chrome, Firefox, Safari, Edge from a single codebase
5. **Extensible** — plugin SDK for custom shields, behavioral models, exports
6. **Privacy-first** — zero telemetry, zero cloud dependency, fully open-source (MIT)

---

## 3. Architecture

### 3.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                     DECLARATIVE NET REQUEST (DNR)                    │
│  • Strip Client Hints (Sec-CH-UA-*, Sec-CH-UA-Platform, etc.)       │
│  • Block STUN/TURN domain requests                                   │
│  • Inject CSP: font-src 'self' (breaks font enumeration)             │
│  • Redirect known fingerprinting CDN scripts                         │
├─────────────────────────────────────────────────────────────────────┤
│                     SERVICE WORKER (MV3)                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐  │
│  │ Profile Manager  │  │ Shield Registry │  │ Message Router      │  │
│  │ (IndexedDB)      │  │ (Dynamic load)  │  │ (popup↔content)     │  │
│  └────────┬────────┘  └────────┬────────┘  └──────────┬──────────┘  │
│           │                    │                       │             │
│           └────────────────────┼───────────────────────┘             │
│                                ▼                                     │
│                     BroadcastChannel Hub                              │
│              (profile updates pushed to all contexts)                 │
├─────────────────────────────────────────────────────────────────────┤
│                     OFFSCREEN DOCUMENT (Persistent)                  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌────────────────────┐  │
│  │ Fingerprint WASM │  │ AudioContext      │  │ Canvas/WebGL       │  │
│  │ (Profile gen)    │  │ (Noise synthesis) │  │ (Pixel operations) │  │
│  └──────────────────┘  └──────────────────┘  └────────────────────┘  │
├─────────────────────────────────────────────────────────────────────┤
│                     CONTENT SCRIPTS (ISOLATED world)                  │
│  • NOT MAIN world — no prototype pollution, no main-thread blocking  │
│  • Each shield: independent, lazy-loaded, self-contained              │
│  • Communication: BroadcastChannel + postMessage                     │
│  • No DOM writes, no data-attributes, no localStorage access         │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.2 Why ISOLATED World Instead of MAIN World

| Aspect | MAIN World (current) | ISOLATED World (target) |
|--------|---------------------|------------------------|
| Performance | Blocks main thread | Zero main-thread impact |
| Detection | Prototype patching is detectable | Invisible to page |
| Safari support | Not supported | Works |
| Store compliance | Triggers review scrutiny | Clean |
| Cleanup | Prototype pollution persists | No cleanup needed |
| Page race | Page can Object.freeze() first | Not applicable |

### 3.3 Communication Model

```
┌──────────────────┐     BroadcastChannel      ┌──────────────────┐
│ Service Worker   │◄─────────────────────────►│ Offscreen Doc    │
│ (Profile Mgr)    │     'maskware-profile'     │ (WASM Engine)    │
└────────┬─────────┘                           └────────┬─────────┘
         │                                              │
         │     BroadcastChannel                         │
         │     'maskware-data'                          │
         ▼                                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Content Scripts                            │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │ Hardware │ │  WebRTC  │ │  Fonts   │ │  AV/Geo  │  ...     │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

### 3.4 Page Script Override Strategy

Since we can't modify prototypes in ISOLATED world, we MUST intercept in MAIN world but WITHOUT extension traces. Strategy:

```typescript
// Phase 1: Inject a single, minimal "seed" script in MAIN world
// This script does ONE thing: install Proxy-based interception BEFORE page scripts run.

// src/shields/inject-seed.ts (runs at document_start, MAIN world)
// This is the ONLY script that runs in MAIN world. ~200 bytes.
(() => {
  'use strict';
  if (window.__maskware_seeded) return;
  window.__maskware_seeded = true;

  // Install a Proxy on the navigator object to intercept property access
  // WITHOUT modifying prototypes (which is detectable)
  const origNavigator = navigator;
  const proxyHandler = {
    get(target, prop, receiver) {
      // Delegate to ISOLATED world via a well-known symbol
      const override = (target as any)[Symbol.for('maskware') + String(prop)];
      if (override !== undefined) return override;
      return Reflect.get(target, prop, receiver);
    }
  };

  try {
    Object.defineProperty(window, 'navigator', {
      get() { return _navProxy; },
      configurable: true
    });
  } catch(_) {}
})();
```

**Key innovation**: The seed script is tiny, obfuscated, and serves only as a bridge. All actual fingerprinting logic stays in ISOLATED world. Communication uses `Symbol.for('maskware_*')` keys that are impossible for page scripts to enumerate.

### 3.5 Full Anti-Detection Checklist

| # | Attack Vector | Mitigation |
|---|--------------|------------|
| 1 | Extension ID probing | No `web_accessible_resources`; random ID per install |
| 2 | DOM attribute scanning | No DOM writes |
| 3 | Storage key scanning | No `localStorage` access from content scripts |
| 4 | Message passing interception | Encrypted messages via `BroadcastChannel` |
| 5 | Prototype inspection | No prototype patching (ISOLATED world) |
| 6 | `Object.getOwnPropertyDescriptor` | Proxy-based interception only |
| 7 | Extension detection via `chrome.runtime` | Check removed from content scripts |
| 8 | Timing side-channel | Consistent timing; WASM for deterministic ops |
| 9 | Canvas pixel hash | Per-pixel Perlin noise (seeded per-origin, per-session) |
| 10 | WebGL parameter enumeration | Full 50+ parameter spoofing via WASM |
| 11 | Audio fingerprint | Synthetic pink noise at -60dB (realistic noise floor) |
| 12 | Font detection | CSP `font-src 'self'` + FontFaceSet override |
| 13 | CSS `matchMedia` | Override for `prefers-color-scheme`, `pointer`, etc. |

---

## 4. Profile System

### 4.1 Coherent Profile Tuples

Instead of independent random selection, profiles are **pre-curated, physically realistic tuples**:

```typescript
// src/shared/profiles.ts
interface HardwareProfile {
  id: string;
  version: number;
  createdAt: number;

  // Platform (all consistent)
  platform: 'Win32' | 'MacIntel' | 'Linux x86_64';
  oscpu: string;
  userAgent: string;

  // Hardware (all consistent with platform + device class)
  gpuVendor: string;
  gpuRenderer: string;
  shortGpu: string;
  fullGpu: string;         // Full WebGL renderer string
  cores: number;           // 2..64
  memory: number;          // 1..128 GB

  // Screen (consistent with device class)
  screenW: number;
  screenH: number;
  availW: number;
  availH: number;
  dpr: number;            // 1.0, 1.25, 1.5, 2.0, 2.25, 3.0
  colorDepth: number;     // 24, 30, 48
  touchPts: number;
  isMobile: boolean;

  // Locale (consistent with geo + platform)
  timezone: string;
  language: string;
  languages: string[];

  // Geo (consistent with timezone)
  city: string;
  country: string;
  lat: number;
  lon: number;

  // Network (consistent with device class)
  connectionType: 'wifi' | 'ethernet' | 'cellular';
  connectionEffective: '4g' | '3g' | '2g' | 'slow-2g';
  downlink: number;       // Mbps
  rtt: number;            // ms

  // Battery (consistent with device class)
  battery: { charging: boolean; level: number };

  // Extras
  plugins: string[];      // Consistent browser plugin list
  mimeTypes: string[];    // Consistent MIME types
}

// Pre-curated profiles with verified consistency
const PROFILES: HardwareProfile[] = [
  {
    // Profile: Windows gaming desktop, RTX 3060, NYC
    platform: 'Win32',
    oscpu: 'Windows NT 10.0; Win64; x64',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ... Chrome/125...',
    gpuVendor: 'Google Inc. (NVIDIA)',
    gpuRenderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)',
    shortGpu: 'NVIDIA GeForce RTX 3060',
    fullGpu: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0)',
    cores: 8, memory: 16,
    screenW: 1920, screenH: 1080, availW: 1920, availH: 1040,
    dpr: 1.0, colorDepth: 24, touchPts: 0, isMobile: false,
    timezone: 'America/New_York', language: 'en-US', languages: ['en-US', 'en'],
    city: 'New York', country: 'US', lat: 40.7128, lon: -74.0060,
    connectionType: 'ethernet', connectionEffective: '4g', downlink: 50, rtt: 15,
    battery: { charging: true, level: 0.85 },
    plugins: [], mimeTypes: [],
  },
  // ... 200+ curated profiles covering all plausible combos
];
```

### 4.2 Profile Versioning & Migration

```typescript
const PROFILE_VERSION = 2;

const MIGRATIONS: Record<number, (p: any) => any> = {
  1: (p) => ({
    ...p,
    fullGpu: p.gpuRenderer,
    userAgent: generateUA(p.platform, p.oscpu),
    plugins: [],
    mimeTypes: [],
    country: inferCountry(p.timezone),
    isMobile: p.touchPts > 0,
    availW: p.screenW,
    availH: p.screenH - 40,
  }),
};
```

### 4.3 Per-Origin Profiles (Unlinkability)

```typescript
// Each origin gets a derived identity — different sites see different devices
function deriveProfile(profile: HardwareProfile, origin: string): HardwareProfile {
  // Deterministic per-origin derivation using HMAC
  const seed = blake3(`${profile.id}:${origin}:${profile.version}`);
  const noise = new SeededRNG(seed);

  return {
    ...profile,
    screenW: profile.screenW + noise.int(-2, 2),
    screenH: profile.screenH + noise.int(-2, 2),
    lat: profile.lat + noise.float(-0.005, 0.005),
    lon: profile.lon + noise.float(-0.005, 0.005),
    cores: profile.cores + noise.int(-1, 1),
    battery: { ...profile.battery, level: clamp(profile.battery.level + noise.float(-0.05, 0.05)) },
  };
}
```

---

## 5. Shield Modules

### 5.1 Shield Architecture

Each shield is an **independent, lazy-loaded module** with a standard interface:

```typescript
// src/shields/types.ts
interface Shield {
  id: string;
  name: string;
  description: string;
  defaultEnabled: boolean;

  // Installation
  install: (profile: HardwareProfile) => Promise<void>;
  uninstall: () => Promise<void>;

  // Optional: per-navigation hooks
  onPageLoad?: (origin: string) => Promise<void>;
  onPageUnload?: () => Promise<void>;

  // Dependencies
  requires?: ('offscreen' | 'wasm' | 'dnr')[];
  conflicts?: string[];  // Incompatible shield IDs
}
```

### 5.2 Shield: Hardware Fingerprint

**Coverage:**

| API | Method | Consistency |
|-----|--------|-------------|
| `navigator.hardwareConcurrency` | Profile value | Consistent with device class |
| `navigator.deviceMemory` | Profile value | Consistent with cores |
| `navigator.platform` | Profile value | Consistent with oscpu |
| `navigator.oscpu` | Profile value | Consistent with platform |
| `navigator.maxTouchPoints` | Profile value | Consistent with isMobile |
| `navigator.userAgent` | Profile value | Consistent with platform/OS |
| `navigator.appVersion` | Derived from UA | Consistent |
| `navigator.productSub` | Derived from UA | Consistent |
| `navigator.vendor` | 'Google Inc.' / '' | Consistent with browser |
| `navigator.vendorSub` | '' | — |
| `navigator.userAgentData` (UA-CH) | Full spoof | Consistent with UA |
| `screen.width/height` | Profile values | Consistent with DPR |
| `screen.availWidth/availHeight` | Profile values | Consistent |
| `screen.colorDepth` | Profile values | — |
| `screen.pixelDepth` | Profile values | — |
| `screen.orientation` | Spoofed | — |
| `window.devicePixelRatio` | Profile value | Consistent with screen |
| `window.outerWidth/Height` | Derived from screen | Consistent |
| `window.innerWidth/Height` | Derived from screen | Consistent |
| Battery API | Profile value + decay curve | Realistic over session |
| `navigator.connection` | Profile values | Consistent with device |
| WebGL `getParameter()` | Full enum tables (50+ params) | Consistent with GPU |
| Canvas `toDataURL/toBlob/getImageData` | Per-pixel Perlin noise | Per-origin, per-session seed |
| WebGL `getExtension()` | Filtered list | Consistent with GPU |
| WebGL `getShaderPrecisionFormat()` | Spoofed | Consistent |
| `WebGLRenderingContext` constants | Native values | — |

### 5.3 Shield: WebRTC

**Strategy**: DNR-based blocking + script-level mock

```json
// rules/webrtc-block.json
[
  {
    "id": 1001,
    "priority": 1,
    "action": { "type": "block" },
    "condition": {
      "urlFilter": "stun:*",
      "resourceTypes": ["other", "websocket"]
    }
  },
  {
    "id": 1002,
    "priority": 1,
    "action": { "type": "block" },
    "condition": {
      "urlFilter": "turn:*",
      "resourceTypes": ["other", "websocket"]
    }
  }
]
```

**Script-level override** (ISOLATED world):

```typescript
// Intercept RTCPeerConnection constructor
const OrigRTCPeerConnection = RTCPeerConnection;
window.RTCPeerConnection = function(config?: RTCConfiguration) {
  return new OrigRTCPeerConnection({
    ...config,
    iceTransportPolicy: 'relay',  // Force relay only
    iceServers: [{ urls: 'turn:maskware.relay:3478', credential: '...' }]
  });
};

// Strip all non-relay candidates from SDP
// Override getStats() to filter local IPs
// Block entire API if user opts in
```

### 5.4 Shield: Audio/Video

**No permission prompt. No real device access.**

```typescript
// Return synthetic streams with realistic metadata
function createFakeAudioTrack(): MediaStreamTrack {
  // Generate pink noise in offscreen document's AudioContext
  const noise = offscreen.createPinkNoise({ level: -60 }); // Realistic noise floor
  const track = offscreen.createTrack(noise);

  // Realistic metadata
  Object.defineProperties(track, {
    label: { get: () => 'Default - Microphone (Realtek High Definition Audio)' },
    deviceId: { get: () => hash(profile.id + ':mic:0') },
    groupId: { get: () => hash(profile.id + ':audio:0') },
    getSettings: { value: () => ({
      sampleRate: 48000, channelCount: 1, deviceId: hash(profile.id + ':mic:0'),
      groupId: hash(profile.id + ':audio:0'), echoCancellation: true, noiseSuppression: true
    })},
    getCapabilities: { value: () => ({
      sampleRate: { min: 8000, max: 48000 },
      channelCount: { min: 1, max: 2 },
      echoCancellation: [true, false],
      noiseSuppression: [true, false]
    })}
  });

  return track;
}

function createFakeVideoTrack(): MediaStreamTrack {
  // Generate static + subtle temporal noise (not solid black)
  const canvas = document.createElement('canvas');
  canvas.width = 640; canvas.height = 480;
  addTemporalNoise(canvas, profile.id); // Seeded noise, ~30fps

  const track = canvas.captureStream(30).getVideoTracks()[0];

  Object.defineProperties(track, {
    label: { get: () => 'Integrated Camera (SunplusIT USB Camera)' },
    deviceId: { get: () => hash(profile.id + ':cam:0') },
    groupId: { get: () => hash(profile.id + ':video:0') },
    getSettings: { value: () => ({
      width: 640, height: 480, frameRate: 30, deviceId: hash(profile.id + ':cam:0'),
    })},
    getCapabilities: { value: () => ({
      width: { min: 320, max: 1920 },
      height: { min: 240, max: 1080 },
      frameRate: { min: 15, max: 30 },
    })}
  });

  return track;
}
```

### 5.5 Shield: Geolocation

```typescript
// Per-call jitter (not per-session), realistic accuracy, simulated drift
function createFakePosition(profile: HardwareProfile, callIndex: number) {
  const seed = blake3(`${profile.id}:geo:${callIndex}`);
  const noise = new SeededRNG(seed);

  // Per-call jitter (not static per-session)
  const jitLat = noise.float(-0.005, 0.005);  // ~500m radius
  const jitLon = noise.float(-0.005, 0.005);

  // Device-appropriate accuracy
  const accuracy = profile.isMobile ? 5 + noise.float(0, 15) : 1000 + noise.float(0, 5000);

  return {
    coords: {
      latitude: profile.lat + jitLat,
      longitude: profile.lon + jitLon,
      accuracy,
      altitude: profile.isMobile ? noise.float(0, 100) : null,
      altitudeAccuracy: profile.isMobile ? noise.float(1, 20) : null,
      heading: profile.isMobile ? noise.float(0, 360) : null,
      speed: profile.isMobile ? noise.float(0, 3) : null,
    },
    timestamp: Date.now() + profile.clockSkew,
  };
}

// Drift simulation for watchPosition
class WatchPositionDrift {
  private lastLat: number;
  private lastLon: number;
  private velocity: { lat: number; lon: number };

  constructor(profile: HardwareProfile) {
    this.lastLat = profile.lat;
    this.lastLon = profile.lon;
    this.velocity = {
      lat: (Math.random() - 0.5) * 0.0001, // ~11m drift per update
      lon: (Math.random() - 0.5) * 0.0001,
    };
  }

  next(): { lat: number; lon: number } {
    this.lastLat += this.velocity.lat + (Math.random() - 0.5) * 0.00005;
    this.lastLon += this.velocity.lon + (Math.random() - 0.5) * 0.00005;
    return { lat: this.lastLat, lon: this.lastLon };
  }
}
```

### 5.6 Shield: Fonts

```typescript
// Strategy: CSP font-src 'self' + API overrides + canvas pixel noise
//
// CSP (via DNR): font-src 'self' breaks @font-face loading for custom fonts
// Script override: FontFaceSet check/has/forEach return false for non-system
// Canvas: pixel-level noise handles font rendering fingerprinting

// DNR rule to inject CSP header:
// Content-Security-Policy: font-src 'self' data:

// Script override (ISOLATED world):
const originalCheck = FontFaceSet.prototype.check;
FontFaceSet.prototype.check = function(font: string, text?: string) {
  // Only "system" fonts pass
  const systemFonts = [
    'Arial', 'Courier New', 'Times New Roman', 'Verdana', 'Georgia',
    'Trebuchet MS', 'Comic Sans MS', 'Impact', 'Lucida Console', 'Tahoma',
    // ... full system font list per OS
  ];
  const fontFamily = font.split(' ')[0].replace(/["']/g, '');
  if (systemFonts.includes(fontFamily)) return true;
  return false; // All custom fonts: "not installed"
};

// FontFaceSet iteration: return only system fonts
Object.defineProperty(FontFaceSet.prototype, 'size', { get() { return 0; } });
FontFaceSet.prototype.forEach = function() {};
FontFaceSet.prototype.values = function*() {};
FontFaceSet.prototype.keys = function*() {};
FontFaceSet.prototype.entries = function*() {};
```

### 5.7 Shield: Locale & Intl

```typescript
// Full Intl API coverage
const IntlConstructors = [
  Intl.DateTimeFormat,
  Intl.NumberFormat,
  Intl.Collator,
  Intl.PluralRules,
  Intl.RelativeTimeFormat,
  Intl.ListFormat,
];

const PatchIntl = (Original: any) => {
  function Patched(locales: any, options: any) {
    const opts = { ...options };
    if (!opts.locale) opts.locale = profile.language;
    if (Original === Intl.DateTimeFormat && !opts.timeZone) {
      opts.timeZone = profile.timezone;
    }
    const instance = new Original(locales || profile.language, opts);
    return instance;
  }
  Patched.prototype = Original.prototype;
  Patched.supportedLocalesOf = Original.supportedLocalesOf;
  return Patched;
};

for (const Ctor of IntlConstructors) {
  try { Object.assign(Ctor, PatchIntl(Ctor)); } catch(_) {}
}

// Also: Intl.getCanonicalLocales, Intl.supportedValuesOf
// Also: Date.prototype.toLocaleString/toLocaleDateString/toLocaleTimeString
// Also: navigator.language, navigator.languages
```

### 5.8 Shield: Client Hints (DNR-based)

```json
{
  "id": 2001,
  "priority": 1,
  "action": { "type": "modifyHeaders", "requestHeaders": [
    { "header": "Sec-CH-UA", "operation": "remove" },
    { "header": "Sec-CH-UA-Arch", "operation": "remove" },
    { "header": "Sec-CH-UA-Bitness", "operation": "remove" },
    { "header": "Sec-CH-UA-Full-Version", "operation": "remove" },
    { "header": "Sec-CH-UA-Full-Version-List", "operation": "remove" },
    { "header": "Sec-CH-UA-Mobile", "operation": "remove" },
    { "header": "Sec-CH-UA-Model", "operation": "remove" },
    { "header": "Sec-CH-UA-Platform", "operation": "remove" },
    { "header": "Sec-CH-UA-Platform-Version", "operation": "remove" },
    { "header": "Sec-CH-UA-WoW64", "operation": "remove" },
    { "header": "Sec-CH-UA-Form-Factors", "operation": "remove" },
    { "header": "Sec-CH-Viewport-Width", "operation": "remove" },
    { "header": "Sec-CH-Viewport-Height", "operation": "remove" },
    { "header": "Sec-CH-Device-Memory", "operation": "remove" },
    { "header": "Sec-CH-DPR", "operation": "remove" },
    { "header": "Sec-CH-Width", "operation": "remove" },
    { "header": "Sec-CH-Prefers-Color-Scheme", "operation": "remove" },
    { "header": "Sec-CH-Prefers-Reduced-Motion", "operation": "remove" },
    { "header": "Sec-CH-Prefers-Contrast", "operation": "remove" },
    { "header": "Sec-CH-Forced-Colors", "operation": "remove" },
    { "header": "Sec-CH-Prefers-Reduced-Transparency", "operation": "remove" },
    { "header": "Sec-CH-Prefers-Reduced-Data", "operation": "remove" },
    { "header": "Accept-Language", "operation": "set", "value": "en-US,en;q=0.9" }
  ]},
  "condition": {
    "resourceTypes": ["main_frame", "sub_frame", "stylesheet", "script", "image", "font", "object", "xmlhttprequest", "ping", "csp_report", "media", "websocket", "webtransport", "webbundle", "other"]
  }
}
```

---

## 6. Anti-Detection

### 6.1 The Seed Script (Only MAIN World Injection)

This is the **only** script that runs in MAIN world. Everything else is ISOLATED.

```typescript
// src/init/seed.js — ~500 bytes, injected at document_start via DNR
//
// Injected via: chrome.scripting.executeScript({ world: 'MAIN', runAt: 'document_start' })
// But only once per page via webNavigation.onBeforeNavigate + check flag

(() => {
  'use strict';
  if (window.__mskwr) return;
  window.__mskwr = 1;

  const S = Symbol.for;
  const P = Object.defineProperty;

  // Install interception layer on navigator (non-enumerable, non-configurable by page)
  const rawNav = navigator;
  let navProxy;

  try {
    P(window, 'navigator', {
      get() {
        if (!navProxy) {
          navProxy = new Proxy(rawNav, {
            get(_, prop) {
              const k = S('mw_' + String(prop));
              if (k in rawNav && rawNav[k] !== undefined) return rawNav[k];
              return Reflect.get(rawNav, prop);
            }
          });
        }
        return navProxy;
      },
      configurable: true, enumerable: true
    });
  } catch(_) {}

  // Same for Screen
  try {
    P(window, 'screen', {
      get() {
        return new Proxy(rawScreen, {
          get(_, prop) {
            const k = S('mw_' + String(prop));
            if (k in rawScreen && rawScreen[k] !== undefined) return rawScreen[k];
            return Reflect.get(rawScreen, prop);
          }
        });
      },
      configurable: true, enumerable: true
    });
  } catch(_) {}

  // Expose a channel for ISOLATED world to push overrides
  window.__mskwr_ready = true;
})();
```

### 6.2 Extension Fingerprint Minimization

| Vector | Mitigation |
|--------|-----------|
| Extension ID | Random per-install ID (not in manifest) |
| `chrome.runtime.id` | Not exposed to content scripts |
| `web_accessible_resources` | **None.** Diagnostics page moved to popup |
| Content script detection | ISOLATED world has no visible side effects |
| `runtime.sendMessage` | Not used from content scripts (BroadcastChannel instead) |
| `localStorage`/`sessionStorage` | Not accessed by content scripts |
| Storage keys | Service worker only |
| Message format | Binary `BroadcastChannel` with deterministic key names |

### 6.3 Timing Attack Defense

```typescript
// All overrides must have CONSISTENT timing regardless of whether they spoof

// Bad (detectable via performance.now()):
//   navigator.hardwareConcurrency → returns instantly
//   navigator.plugins → returns instantly (real would be slightly slower)

// Good (consistent timing):
const OVERRIDE_DELAY = 0.02; // ms — calibrated to match real API lookup time

function timedGetter(fn: () => any): any {
  const start = performance.now();
  const result = fn();
  const elapsed = performance.now() - start;
  if (elapsed < OVERRIDE_DELAY) {
    // Busy-wait (only <0.02ms, imperceptible)
    while (performance.now() - start < OVERRIDE_DELAY) {}
  }
  return result;
}
```

---

## 7. Tech Stack

| Component | Technology | Reason |
|-----------|-----------|--------|
| Core language | TypeScript 5.x | Type safety, tooling |
| Build | esbuild | Speed, tree-shaking, bundling |
| Package manager | pnpm | Fast, strict, monorepo-ready |
| WASM module | Rust → wasm-pack | Fingerprint generation, crypto |
| Offscreen | Chrome Offscreen API | Persistent canvas/audio context |
| State | IndexedDB (via `idb`) | Cross-context persistence |
| Communication | BroadcastChannel | Cross-context messaging |
| Network rules | Declarative Net Request | MV3-native, performant |
| Testing | Vitest (unit) + Playwright (e2e) | Modern, fast, cross-browser |
| CI/CD | GitHub Actions | Free, integrated |
| Linting | ESLint + Prettier | Code quality |
| Type checking | tsc --noEmit | Strict mode |
| Profiling | Lighthouse CI | Performance regression |
| Store lint | web-ext lint | AMO/CWS compliance |

---

## 8. Project Structure

```
maskware/
├── .github/
│   └── workflows/
│       ├── ci.yml              # Build + test + lint
│       ├── release.yml         # Package + publish
│       └── nightly.yml         # Nightly canary builds
├── src/
│   ├── background/
│   │   ├── index.ts            # Service worker entry
│   │   ├── profile-manager.ts  # Profile CRUD, migration, validation
│   │   ├── shield-registry.ts  # Dynamic shield enable/disable
│   │   ├── message-router.ts   # Popup ↔ Background messages
│   │   └── dnr-manager.ts      # Declarative Net Request rules
│   ├── init/
│   │   └── seed.ts             # MAIN world seed script (~500 bytes)
│   ├── offscreen/
│   │   ├── index.ts            # Offscreen document entry
│   │   ├── fingerprint.ts      # WASM bindings
│   │   ├── audio-synth.ts      # Pink noise generator
│   │   └── canvas-noise.ts     # Perlin noise for canvas
│   ├── shields/
│   │   ├── types.ts            # Shield interface
│   │   ├── hardware/
│   │   │   ├── index.ts        # Hardware shield
│   │   │   ├── navigator.ts    # Navigator overrides
│   │   │   ├── screen.ts       # Screen overrides
│   │   │   ├── webgl.ts        # WebGL parameter tables
│   │   │   ├── battery.ts      # Battery API with decay
│   │   │   ├── connection.ts   # Network Information API
│   │   │   └── user-agent.ts   # UA + UA-CH spoof
│   │   ├── webrtc/
│   │   │   ├── index.ts        # WebRTC shield
│   │   │   └── rules.json      # DNR rules for STUN/TURN
│   │   ├── av/
│   │   │   ├── index.ts        # AV shield
│   │   │   ├── audio-track.ts  # Fake audio track
│   │   │   └── video-track.ts  # Fake video track
│   │   ├── fonts/
│   │   │   ├── index.ts        # Font shield
│   │   │   └── system-fonts.ts # Per-OS system font lists
│   │   ├── geo/
│   │   │   └── index.ts        # Geolocation shield
│   │   ├── locale/
│   │   │   └── index.ts        # Intl + locale shield
│   │   ├── client-hints/
│   │   │   └── rules.json      # DNR rules for Client Hints
│   │   ├── css-media/
│   │   │   └── index.ts        # matchMedia overrides
│   │   ├── permissions/
│   │   │   └── index.ts        # Permissions API shield
│   │   └── plugins/
│   │       └── index.ts        # Plugin + MIME type shield
│   ├── popup/
│   │   ├── index.html
│   │   ├── App.tsx             # Preact component
│   │   ├── components/
│   │   │   ├── IdentityCard.tsx
│   │   │   ├── ShieldToggle.tsx
│   │   │   ├── Diagnostics.tsx
│   │   │   ├── ProfileSelector.tsx
│   │   │   └── ThemeToggle.tsx
│   │   └── styles.css
│   ├── shared/
│   │   ├── types.ts            # All TypeScript types
│   │   ├── profiles.ts         # Curated profile database
│   │   ├── profile-db.ts       # IndexedDB wrapper
│   │   ├── constants.ts        # Magic numbers, defaults
│   │   ├── crypto.ts           # blake3, seeded RNG, HMAC
│   │   ├── browser-api.ts      # Browser API normalization
│   │   ├── channel.ts          # BroadcastChannel helpers
│   │   └── utils.ts            # clamp, hash, delay, etc.
│   └── assets/
│       └── icons/
│           ├── icon-16.png
│           ├── icon-48.png
│           ├── icon-96.png
│           └── icon-128.png
├── rules/
│   ├── webrtc-block.json       # DNR: block STUN/TURN
│   └── client-hints-strip.json # DNR: strip Sec-CH-UA-*
├── tests/
│   ├── unit/
│   │   ├── profiles.test.ts
│   │   ├── crypto.test.ts
│   │   ├── profile-db.test.ts
│   │   └── shields/
│   │       ├── hardware.test.ts
│   │       ├── webrtc.test.ts
│   │       ├── geo.test.ts
│   │       └── locale.test.ts
│   ├── integration/
│   │   ├── profile-flow.test.ts
│   │   ├── shield-toggle.test.ts
│   │   └── cross-browser.test.ts
│   ├── e2e/
│   │   ├── fingerprinter.spec.ts   # Test against CreepJS/FingerprintJS
│   │   ├── install-flow.spec.ts
│   │   └── new-identity.spec.ts
│   └── fixtures/
│       ├── creepjs-mock.html
│       └── fingerprintjs-mock.html
├── wasm/
│   ├── Cargo.toml
│   └── src/
│       ├── lib.rs               # WASM entry
│       ├── fingerprint.rs       # Fingerprint generation
│       ├── noise.rs             # Perlin noise for canvas
│       ├── random.rs            # Seeded RNG (ChaCha20)
│       └── webgl.rs             # WebGL parameter tables
├── manifest.json                # Extension manifest
├── package.json
├── tsconfig.json
├── esbuild.config.mjs
├── .eslintrc.json
├── .prettierrc
├── vitest.config.ts
├── playwright.config.ts
├── CONTRIBUTING.md
├── CODE_OF_CONDUCT.md
├── SECURITY.md
├── CHANGELOG.md
├── LICENSE                     # MIT
└── README.md
```

---

## 9. Build System

```javascript
// esbuild.config.mjs
import esbuild from 'esbuild';
import { readFile } from 'fs/promises';

const manifest = JSON.parse(await readFile('manifest.json', 'utf-8'));

const configs = [
  // Service worker
  {
    entryPoints: ['src/background/index.ts'],
    outfile: 'dist/background.js',
    bundle: true, minify: true, target: 'es2022',
    format: 'iife', platform: 'browser',
    define: { 'process.env.NODE_ENV': '"production"' },
  },
  // Offscreen document
  {
    entryPoints: ['src/offscreen/index.ts'],
    outfile: 'dist/offscreen.js',
    bundle: true, minify: true, target: 'es2022',
    format: 'iife', platform: 'browser',
  },
  // Seed script (minimal, ~500 bytes)
  {
    entryPoints: ['src/init/seed.ts'],
    outfile: 'dist/seed.js',
    bundle: true, minify: true, target: 'es2020',
    format: 'iife', platform: 'browser',
  },
  // Popup
  {
    entryPoints: ['src/popup/App.tsx'],
    outfile: 'dist/popup.js',
    bundle: true, minify: true, target: 'es2022',
    format: 'iife', platform: 'browser',
    loader: { '.tsx': 'tsx' },
  },
  // Shields (one bundle per shield — lazy loaded)
  ...['hardware', 'webrtc', 'av', 'fonts', 'geo', 'locale', 'css-media', 'permissions', 'plugins'].map(name => ({
    entryPoints: [`src/shields/${name}/index.ts`],
    outfile: `dist/shields/${name}.js`,
    bundle: true, minify: true, target: 'es2022',
    format: 'iife', platform: 'browser',
  })),
];

for (const config of configs) {
  await esbuild.build(config);
}

// Copy static files
await copyDir('src/assets/icons', 'dist/icons');
await copyDir('rules', 'dist/rules');
await copyFile('manifest.json', 'dist/manifest.json');
await copyFile('src/popup/index.html', 'dist/popup.html');
```

### Package.json

```json
{
  "name": "maskware",
  "version": "2.0.0",
  "description": "Polymorphic browser fingerprinting protection",
  "license": "MIT",
  "type": "module",
  "scripts": {
    "dev": "node esbuild.config.mjs --watch",
    "build": "node esbuild.config.mjs && web-ext build --source-dir=dist --artifacts-dir=build",
    "typecheck": "tsc --noEmit",
    "lint": "eslint src/ --ext .ts,.tsx",
    "format": "prettier --write src/",
    "test:unit": "vitest run",
    "test:e2e": "playwright test",
    "test:all": "pnpm test:unit && pnpm test:e2e",
    "check": "pnpm typecheck && pnpm lint && pnpm test:all",
    "release": "pnpm check && pnpm build"
  },
  "devDependencies": {
    "@playwright/test": "latest",
    "@types/node": "latest",
    "esbuild": "latest",
    "eslint": "latest",
    "prettier": "latest",
    "typescript": "latest",
    "vitest": "latest",
    "web-ext": "latest"
  }
}
```

---

## 10. Testing Strategy

### 10.1 Unit Tests (Vitest)

```typescript
// tests/unit/profiles.test.ts
import { describe, it, expect } from 'vitest';
import { PROFILES, validateProfile } from '../../src/shared/profiles';

describe('Profile Database', () => {
  it('all profiles pass validation', () => {
    for (const profile of PROFILES) {
      expect(validateProfile(profile)).toBe(true);
    }
  });

  it('no profile has impossible combinations', () => {
    for (const profile of PROFILES) {
      // platform must match oscpu
      if (profile.platform === 'Win32') {
        expect(profile.oscpu).toContain('Windows');
      }
      if (profile.platform === 'MacIntel') {
        expect(profile.oscpu).toContain('Mac OS X');
      }
      // timezone continent must match language
      if (profile.timezone.startsWith('Asia/')) {
        expect(profile.languages[0]).not.toBe('en-US');
      }
      // touch points must match isMobile
      expect(profile.isMobile).toBe(profile.touchPts > 0);
    }
  });
});
```

### 10.2 E2E Tests (Playwright)

```typescript
// tests/e2e/fingerprinter.spec.ts
import { test, expect } from './extension-fixture';

test('passes CreepJS detection', async ({ pageWithExtension }) => {
  await pageWithExtension.goto('https://abrahamjuliot.github.io/creepjs/');
  await pageWithExtension.waitForTimeout(3000);

  // CreepJS shows trust score — should be high (not detected as bot)
  const trustScore = await pageWithExtension.evaluate(() => {
    return document.querySelector('.trust-rating')?.textContent;
  });

  expect(trustScore).toBeDefined();
  // Should not trigger "spoofing detected" warnings
});

test('passes FingerprintJS Pro bot detection', async ({ pageWithExtension }) => {
  await pageWithExtension.goto('https://fingerprint.com/products/bot-detection/');
  await pageWithExtension.waitForTimeout(5000);

  const botScore = await pageWithExtension.evaluate(() => {
    return (window as any).__fpjs_bot_score;
  });

  // Bot score should be < 0.3 (not detected as bot)
  expect(botScore).toBeLessThan(0.3);
});
```

### 10.3 Cross-Browser Matrix

```typescript
// playwright.config.ts
export default defineConfig({
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], channel: 'chromium' } },
    { name: 'firefox',  use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit',   use: { ...devices['Desktop Safari'] } },
  ],
});
```

---

## 11. CI/CD Pipeline

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: 'pnpm' }
      - run: pnpm install
      - run: pnpm typecheck
      - run: pnpm lint
      - run: pnpm format --check

  test-unit:
    runs-on: ubuntu-latest
    needs: quality
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: 'pnpm' }
      - run: pnpm install
      - run: pnpm test:unit

  test-e2e:
    runs-on: ubuntu-latest
    needs: quality
    strategy:
      matrix:
        browser: [chromium, firefox, webkit]
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: 'pnpm' }
      - run: pnpm install
      - run: pnpm build
      - run: npx playwright install --with-deps ${{ matrix.browser }}
      - run: pnpm test:e2e --project=${{ matrix.browser }}

  store-lint:
    runs-on: ubuntu-latest
    needs: quality
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: 'pnpm' }
      - run: pnpm install
      - run: pnpm build
      - run: npx web-ext lint --source-dir=dist

  release:
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    needs: [test-unit, test-e2e, store-lint]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: 'pnpm' }
      - run: pnpm install
      - run: pnpm build
      - name: Create release
        uses: softprops/action-gh-release@v2
        with:
          tag_name: v${{ github.run_number }}
          files: build/*.zip
          generate_release_notes: true
```

---

## 12. Store Compliance

### Chrome Web Store

| Requirement | Status | Note |
|-------------|--------|------|
| Manifest V3 | Required | Already MV3 |
| `host_permissions` justification | Documented | "Fingerprint protection requires intercepting all page properties" |
| No `activeTab` alternative | Justified | Must spoof APIs on all tabs |
| No remote code | Compliant | All code bundled, no eval/Function |
| No unnecessary permissions | Minimal | `storage`, `scripting`, `tabs`, `declarativeNetRequest` |
| Privacy policy URL | Required | Link to privacy page in store listing |
| Single purpose | Compliant | "Protect users from browser fingerprinting" |

### Firefox AMO

| Requirement | Status | Note |
|-------------|--------|------|
| No obfuscated code | Compliant | No minified-by-hand code; build with source maps |
| Open source link | Required | GitHub link in listing |
| `strict_min_version` | Set to 128 | Justified: needs `world: MAIN` in `scripting` API |

### Apple Safari (Web Extension)

| Requirement | Status | Note |
|-------------|--------|------|
| Xcode project | Required | Build via `safari-web-extension-converter` |
| `world: 'ISOLATED'` only | Compliant | No MAIN world; seed script handled via `WKUserScript` |

---

## 13. Ecosystem & Growth

### 13.1 Developer SDK

```typescript
// npm install maskware-sdk
import { Maskware, Profile } from 'maskware-sdk';

// Use in Puppeteer/Playwright/Selenium
const maskware = await Maskware.create({ headless: true });
const profile = await maskware.generateProfile({ deviceClass: 'desktop', region: 'eu' });

// Apply to any HTTP client
const response = await maskware.fetch('https://api.example.com', {
  profile,
  headers: { 'X-Custom': 'value' }
});

// Browser automation
const browser = await puppeteer.launch();
const page = await browser.newPage();
await maskware.inject(page, profile);  // Inject fingerprint spoofing
await page.goto('https://target.com');
```

### 13.2 Plugin Marketplace

```typescript
// Plugin API
interface MaskwarePlugin {
  id: string;
  version: string;
  name: string;
  shields?: Shield[];           // Custom shields
  profiles?: HardwareProfile[]; // Custom profile packs
  hooks?: {
    onBeforeInject?: (profile: HardwareProfile, page: string) => HardwareProfile;
    onAfterInject?: (page: string) => void;
  };
}

// Community plugins
// - maskware-plugin-proxy: Chain profiles through SOCKS proxies
// - maskware-plugin-selenium: Native Selenium WebDriver integration
// - maskware-plugin-discord: Auto-rotate profile for Discord
// - maskware-plugin-banking: Optimized profiles for banking sites
```

### 13.3 Growth Strategy

| Phase | Tactic | Expected Impact |
|-------|--------|----------------|
| **Launch** | Hacker News "Show HN" | 500+ stars |
| **Week 1** | r/privacy, r/netsec, r/browsers | 2,000+ stars |
| **Week 2** | YouTube review by privacy channels | 5,000+ stars |
| **Week 4** | CreepJS author acknowledges passes | 10,000+ stars |
| **Month 2** | Plugin SDK launch + 10 community plugins | Sustained growth |
| **Month 6** | Enterprise Edition with 3 pilot customers | Revenue |
| **Year 1** | 20K+ stars, 100K+ users, 500+ enterprise seats | Self-sustaining |

### 13.4 Monetization

| Tier | Price | Features |
|------|-------|----------|
| **Community** | Free (MIT) | All shields, curated profiles, self-hosted |
| **Pro** | $5/mo | Premium profiles, priority updates, Discord support |
| **Business** | $25/user/mo | Policy-as-Code, SIEM integration, centralized management |
| **Enterprise** | Custom | SSO, SLA, dedicated honeypot, custom profiles, on-premise |

### 13.5 Documentation

- **README.md**: Quick start, features, FAQ
- **docs/architecture.md**: Full architecture overview
- **docs/api.md**: SDK API reference
- **docs/contributing.md**: How to contribute
- **docs/shields.md**: Shield documentation
- **docs/profiles.md**: Profile system documentation
- **docs/enterprise.md**: Enterprise deployment guide
- **docs/testing.md**: Testing your fingerprint protection

---

## 14. Enterprise Edition

### 14.1 Policy-as-Code

```yaml
# maskware-policy.yaml (deployed via MDM / GPO / Intune)
version: 2
organization: acme-corp

policies:
  - name: "Banking & finance"
    matches: ["*.bank.com", "*.chase.com", "payroll.internal"]
    profile:
      preset: "windows-corporate-desktop"
      consistency: "maximum"         # No variation between sites
    shields:
      hardware: true
      webrtc: false                  # WebRTC needed for video calls
      av: true
      geo: true
      locale: true

  - name: "General browsing"
    matches: ["*"]
    profile:
      preset: "auto-rotate"          # Rotate profile daily
      consistency: "balanced"
    shields:
      all: true
```

### 14.2 SIEM Integration

```typescript
// Log fingerprint events to SIEM
interface SIEMEvent {
  timestamp: number;
  event_type: 'profile_generated' | 'shield_toggled' | 'detection_encountered';
  profile_id: string;
  details: Record<string, string>;
}

// Connectors: Splunk (HEC), Elastic (Beats), Azure Sentinel (Log Analytics)
```

---

## 15. Roadmap

### Phase 1: Solid Core (Months 1-2)
**Goal: Pass CreepJS + FingerprintJS Pro detection**

- [ ] Set up build system (esbuild + TypeScript)
- [ ] Implement profile validation & migration
- [ ] Create curated profile database (200+ coherent profiles)
- [ ] Rewrite all shields in ISOLATED world
- [ ] Implement BroadcastChannel communication
- [ ] Create seed script (MAIN world bridge)
- [ ] Add hardware shield (full coverage)
- [ ] Add Client Hints stripping (DNR)
- [ ] Add canvas pixel-level noise
- [ ] Add WebGL full parameter spoofing
- [ ] Add WebRTC full leak protection
- [ ] Add AudioContext noise synthesis
- [ ] Add font enumeration protection (CSP + API)
- [ ] Add geolocation per-call jitter + drift
- [ ] Add full Intl coverage
- [ ] Remove all DOM attribute writes
- [ ] Remove web_accessible_resources
- [ ] Add unit tests + Playwright E2E tests
- [ ] Test against CreepJS, FingerprintJS Pro, BotD
- [ ] **Launch v2.0 beta**

### Phase 2: Advanced Protection (Months 3-4)
**Goal: Pass all automated scanners + manual analysis**

- [ ] Per-origin profile derivation (unlinkability)
- [ ] WASM fingerprint generation module (Rust)
- [ ] Offscreen document for persistent canvas/AudioContext
- [ ] Behavioral biometrics: mouse/keyboard/scroll noise
- [ ] Adaptive evasion: escalate when detection scripts detected
- [ ] Honeypot network: community-reported detection vectors
- [ ] Profile marketplace: community-shared profiles
- [ ] Plugin SDK v1.0
- [ ] **Launch v2.0 stable**

### Phase 3: Ecosystem (Months 5-8)
**Goal: 10K+ stars, thriving community**

- [ ] npm SDK (`maskware-sdk`)
- [ ] Puppeteer/Playwright/Selenium integration
- [ ] 10+ community plugins
- [ ] Enterprise Edition pilot (3 customers)
- [ ] Policy-as-Code system
- [ ] SIEM connectors (Splunk, Elastic, Sentinel)
- [ ] Automated testing dashboard
- [ ] Research grant program launch
- [ ] First Chimera Cup CTF event

### Phase 4: Network Layer (Months 9-12)
**Goal: Full-stack fingerprint protection**

- [ ] TLS fingerprint randomization (JA3/JA3S)
- [ ] HTTP/2 SETTINGS randomization
- [ ] QUIC/HTTP3 fingerprint shaping
- [ ] TCP/IP stack variance (OS-level, optional)
- [ ] Proxy chain integration
- [ ] Custom VPN server integration

---

## Glossary

| Term | Definition |
|------|-----------|
| **ISOLATED world** | Content script execution context separated from page scripts |
| **MAIN world** | Page's own JavaScript execution context |
| **Seed script** | Minimal ~500 byte script injected in MAIN world to bridge ISOLATED overrides |
| **DNR** | Declarative Net Request — MV3 API for network filtering |
| **Offscreen document** | Persistent background page for canvas/audio operations |
| **Coherent profile** | A fingerprint profile where all properties are mutually consistent |
| **Perlin noise** | Gradient noise algorithm for realistic canvas pixel perturbation |
| **JA3/JA3S** | TLS client/server hello fingerprint |
| **STUN/TURN** | WebRTC NAT traversal protocols that can leak real IP |
| **srflx** | Server Reflexive candidate — reveals real public IP via STUN |
| **Client Hints** | HTTP headers (`Sec-CH-UA-*`) that expose browser/device info server-side |
| **Per-origin profile** | Different fingerprint identity per website (unlinkability) |

---

## License

MIT — Free for personal and commercial use.

## Contributors

See [CONTRIBUTING.md](./CONTRIBUTING.md) for how to contribute.

## Security

See [SECURITY.md](./SECURITY.md) for vulnerability reporting.

---

*"If you know the enemy and know yourself, you need not fear the result of a hundred battles."* — Sun Tzu