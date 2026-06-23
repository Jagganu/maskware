export interface HardwareProfile {
  id: string;
  version: number;
  createdAt: number;

  platform: "Win32" | "MacIntel" | "Linux x86_64";
  oscpu: string;
  userAgent: string;

  gpuVendor: string;
  gpuRenderer: string;
  shortGpu: string;
  fullGpu: string;
  cores: number;
  memory: number;

  screenW: number;
  screenH: number;
  availW: number;
  availH: number;
  dpr: number;
  colorDepth: number;
  touchPts: number;
  isMobile: boolean;

  timezone: string;
  language: string;
  languages: string[];

  city: string;
  country: string;
  lat: number;
  lon: number;

  connectionType: "wifi" | "ethernet" | "cellular";
  connectionEffective: "4g" | "3g" | "2g" | "slow-2g";
  downlink: number;
  rtt: number;

  battery: { charging: boolean; level: number };

  plugins: string[];
  mimeTypes: string[];

  clockSkew: number;
}

export interface Shield {
  id: string;
  name: string;
  description: string;
  defaultEnabled: boolean;
  install: (profile: HardwareProfile) => Promise<void>;
  uninstall: () => Promise<void>;
  onPageLoad?: (origin: string) => Promise<void>;
  onPageUnload?: () => Promise<void>;
  requires?: ("offscreen" | "wasm" | "dnr")[];
  conflicts?: string[];
}

export interface ShieldConfig {
  [shieldId: string]: boolean;
}

export interface ProfileValidation {
  valid: boolean;
  missing: string[];
}

export const REQUIRED_FIELDS: (keyof HardwareProfile)[] = [
  "id",
  "version",
  "createdAt",
  "platform",
  "oscpu",
  "userAgent",
  "gpuVendor",
  "gpuRenderer",
  "shortGpu",
  "fullGpu",
  "cores",
  "memory",
  "screenW",
  "screenH",
  "availW",
  "availH",
  "dpr",
  "colorDepth",
  "touchPts",
  "isMobile",
  "timezone",
  "language",
  "languages",
  "city",
  "country",
  "lat",
  "lon",
  "connectionType",
  "connectionEffective",
  "downlink",
  "rtt",
  "battery",
  "plugins",
  "mimeTypes",
  "clockSkew",
];

export function validateProfile(profile: unknown): ProfileValidation {
  if (!profile || typeof profile !== "object") {
    return { valid: false, missing: REQUIRED_FIELDS };
  }
  const p = profile as Record<string, unknown>;
  const missing = REQUIRED_FIELDS.filter(
    (f) => !(f in p) || p[f] === undefined || p[f] === null,
  );
  return { valid: missing.length === 0, missing };
}
