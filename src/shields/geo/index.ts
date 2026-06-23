import type { HardwareProfile } from "../../shared/types";
import { subscribe } from "../../shared/channel";
import { blake3seed } from "../../shared/crypto";

let geoProfile = { lat: 40.7128, lon: -74.006, city: "New York" };
let ready = false;
let watchCounter = 0;
const watches = new Map<number, { success: PositionCallback }>();
const queue: Array<{
  success: PositionCallback;
  error?: PositionErrorCallback;
}> = [];
let sessionSeed = 0;
let callIndex = 0;

crypto.getRandomValues(new Uint32Array(1)).forEach((v) => {
  sessionSeed = v;
});

function srand(): number {
  sessionSeed ^= sessionSeed << 13;
  sessionSeed ^= sessionSeed >>> 17;
  sessionSeed ^= sessionSeed << 5;
  return ((sessionSeed >>> 0) % 1000000) / 1000000;
}

class SeededRNG {
  private state: number;
  constructor(seed: number) {
    this.state = seed;
  }
  next(): number {
    this.state ^= this.state << 13;
    this.state ^= this.state >>> 17;
    this.state ^= this.state << 5;
    return (this.state >>> 0) / 0xffffffff;
  }
  float(min: number, max: number): number {
    return min + this.next() * (max - min);
  }
}

function createPosition(): GeolocationPosition {
  callIndex++;
  const seed = sessionSeed + callIndex;
  const rng = new SeededRNG(seed);

  const jitLat = rng.float(-0.005, 0.005);
  const jitLon = rng.float(-0.005, 0.005);

  const coords: GeolocationCoordinates = {
    latitude: geoProfile.lat + jitLat,
    longitude: geoProfile.lon + jitLon,
    altitude: null,
    accuracy: 20 + rng.float(0, 15),
    altitudeAccuracy: null,
    heading: null,
    speed: null,
    toJSON() {
      return this;
    },
  };
  return {
    coords,
    timestamp: Date.now(),
    toJSON() {
      return { coords: this.coords, timestamp: this.timestamp };
    },
  };
}

function flush() {
  while (queue.length) {
    const item = queue.shift()!;
    setTimeout(
      () => item.success(createPosition()),
      50 + Math.floor(srand() * 200),
    );
  }
}

const overrides = {
  getCurrentPosition(success: PositionCallback, error?: PositionErrorCallback) {
    if (!ready) {
      queue.push({ success, error });
      return;
    }
    setTimeout(() => success(createPosition()), 50 + Math.floor(srand() * 200));
  },
  watchPosition(
    success: PositionCallback,
    error?: PositionErrorCallback,
    _options?: PositionOptions,
  ) {
    const id = ++watchCounter;
    if (!ready) {
      queue.push({ success, error });
      return id;
    }
    watches.set(id, { success });
    setInterval(
      () => {
        if (watches.has(id)) success(createPosition());
      },
      5000 + Math.floor(srand() * 5000),
    );
    return id;
  },
  clearWatch(id: number) {
    watches.delete(id);
  },
};

function install(target: any) {
  for (const [k, v] of Object.entries(overrides)) {
    try {
      Object.defineProperty(target, k, {
        value: v,
        configurable: true,
        writable: true,
      });
    } catch (_) {}
  }
}

try {
  if (navigator.geolocation) install(navigator.geolocation);
} catch (_) {}
try {
  if ((window as any).Geolocation)
    install((window as any).Geolocation.prototype);
} catch (_) {}

subscribe("maskware-profile", (msg) => {
  if (msg.type === "profile-updated") {
    const p = msg.profile as HardwareProfile;
    geoProfile = { lat: p.lat, lon: p.lon, city: p.city };
    ready = true;
    flush();
  }
});

setTimeout(() => {
  if (!ready) {
    ready = true;
    flush();
  }
}, 3000);
