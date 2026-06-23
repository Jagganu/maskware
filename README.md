# Maskware — Privacy & Fingerprint Mask (Firefox)

Six independent shields, each its own toggle, plus a live identity dashboard
in the popup.

## Shields

| Shield | Default | What it does |
|---|---|---|
| Hardware fingerprint | on | Fake CPU core count, GPU vendor/renderer, screen resolution, OS string, device memory, network type, battery status — plus noise on canvas/WebGL pixel readback and AudioContext output. Fresh profile every page load. |
| WebRTC IP leak | on | Strips `srflx` (STUN-derived) ICE candidates — the ones that leak your real public IP past a VPN. |
| Font detection | on | Adds imperceptible noise to canvas `measureText()` width (defeats the classic font-probing technique) and blocks `document.fonts.check()`/`.load()` from confirming non-standard fonts. |
| Mic & Camera block | on | See below — works even after you grant permission. |
| GPS location | on | Reports a random major world city (jittered ~1 km) instead of your real GPS fix. Fresh per page load. |
| Timezone & language | off | Reports UTC / en-US. Off by default since it visibly shifts every displayed date/time on every site. |

## Identity dashboard

The popup shows the fake GPU, CPU, OS, screen, and city Maskware is
currently presenting to the active tab. **Generate New Identity** reloads
the tab, which triggers a fresh random profile for everything above (geo
included) — useful right before visiting a site you don't want linked to
your last visit there.

## How Mic & Camera block works

It intercepts `getUserMedia`/`getDisplayMedia`, lets the *real* browser
permission prompt happen as normal (so you still see and control the
permission request honestly), briefly grabs the real stream and
immediately stops it, then hands the page a synthetic stream instead:
silence for audio, a solid black frame for video/screen-share. The page
gets a live, valid `MediaStream` — it just never receives your actual
voice or image, **even though it has permission**.

## Load it in Firefox

1. `about:debugging` → **This Firefox** → **Load Temporary Add-on**.
2. Select `manifest.json` from this folder.
3. Open the toolbar icon for the dashboard and the six toggles.
4. Reload open tabs after flipping a toggle — changes apply to new page loads only.

Temporary add-ons unload on Firefox restart. For persistence: submit an
**unlisted** build on [addons.mozilla.org](https://addons.mozilla.org)
(signing only, doesn't have to be public), or use Firefox Developer
Edition/Nightly with `xpinstall.signatures.required` set to `false` in
`about:config`.

## Design notes / tradeoffs

- **WebRTC**: only `srflx` candidates are stripped. `host` (already
  mDNS-masked by Firefox) and `relay` (a TURN server's IP, not yours) are
  left alone, so calls on apps with TURN fallback (Discord, Meet,
  Zoom-web) should still connect.
- **Fonts**: CSS `@font-face { src: local(...) }` detection happens inside
  the rendering engine itself, below what a JS content script can reach —
  blocking it would mean disabling local font loading entirely, breaking
  font rendering on legitimate sites. The JS-level vectors (canvas probing,
  FontFaceSet) are covered; this is the one gap that's structural, not an
  oversight.
- **WebGL**: only the identifying VENDOR/RENDERER strings are faked, never
  capability numbers like `MAX_TEXTURE_SIZE` — changing those can make
  WebGL games/apps request allocations the real GPU can't satisfy.
- **`navigator.mediaDevices.enumerateDevices()`** (device *list*, separate
  from the actual stream) is left untouched — faking counts/IDs here risks
  breaking device pickers in real calling apps. The actual audio/video
  *content* is what's blocked, via the stream substitution above.
- **Locale** defaults off because, unlike the others, it's not something
  you'd want silently changing dates/times across all browsing — turn it
  on per-session when you specifically want it.

## Files

- `manifest.json` — MV3, requires Firefox 128+ (for `world: "MAIN"` content scripts)
- `background.js` — registers/unregisters each shield independently; relays dashboard data into storage
- `bridge.js` — ISOLATED-world script that reads the fake profile off the page DOM and forwards it to background.js (MAIN-world scripts can't call extension APIs directly)
- `inject-hardware.js` / `inject-webrtc.js` / `inject-fonts.js` / `inject-av.js` / `inject-geo.js` / `inject-locale.js` — the six shields, each runs in the page's own JS context
- `popup.html` / `popup.js` — dashboard, New Identity button, six toggles
