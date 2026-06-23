export const EXT_ID = "maskware";
export const VERSION = 2;

export const CHANNELS = {
  PROFILE: "maskware-profile",
  DATA: "maskware-data",
  CMD: "maskware-cmd",
} as const;

export const SHIELD_META: Record<
  string,
  { name: string; desc: string; icon: string; default: boolean }
> = {
  hardware: {
    name: "Hardware",
    desc: "Navigator, Screen, WebGL, Canvas, Battery, Connection",
    icon: "/cpu",
    default: true,
  },
  webrtc: {
    name: "WebRTC",
    desc: "Block local IP leaks via relay-only policy",
    icon: "/globe",
    default: true,
  },
  fonts: {
    name: "Fonts",
    desc: "Canvas text noise, FontFaceSet blocking, font whitelist",
    icon: "/type",
    default: true,
  },
  av: {
    name: "Audio / Video",
    desc: "Pink noise audio, temporal video noise, fake devices",
    icon: "/mic",
    default: true,
  },
  geo: {
    name: "Geolocation",
    desc: "Per-call jitter, watchPosition drift",
    icon: "/map-pin",
    default: true,
  },
  locale: {
    name: "Locale",
    desc: "Intl, Date, navigator.language spoofing",
    icon: "/languages",
    default: false,
  },
  "css-media": {
    name: "CSS Media",
    desc: "matchMedia overrides for prefers-* queries",
    icon: "/monitor",
    default: true,
  },
  permissions: {
    name: "Permissions",
    desc: 'Return "prompt" for sensitive permissions',
    icon: "/shield",
    default: true,
  },
  plugins: {
    name: "Plugins",
    desc: "Empty plugins/mimeTypes, vendor override",
    icon: "/puzzle",
    default: true,
  },
};

export const DNR_RULESETS = [
  "rules/client-hints-strip.json",
  "rules/webrtc-block.json",
  "rules/csp-font-src.json",
];

export const STORAGE_KEYS = {
  PROFILE_ID: "maskware-profile-id",
  PROFILE_VERSION: "maskware-profile-version",
  SHIELD_CONFIG: "maskware-shield-config",
  FIRST_RUN: "maskware-first-run",
} as const;

export const PROFILE_REFRESH_MS = 24 * 60 * 60 * 1000;
export const BATTERY_DECAY_INTERVAL_MS = 60_000;
export const GEO_JITTER_RANGE = 0.005;
export const CANVAS_NOISE_RANGE = 3;
export const AUDIO_NOISE_DB = -60;
