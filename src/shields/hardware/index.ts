import type { HardwareProfile } from "../../shared/types";
import { subscribe } from "../../shared/channel";
import { blake3seed } from "../../shared/crypto";
import { timedGetter } from "../../shared/crypto";

let p: HardwareProfile | null = null;
let connectionObj: any = null;
let batteryDecayInterval: ReturnType<typeof setInterval> | null = null;

function def(obj: any, prop: PropertyKey, getter: () => any, useTiming: boolean = true) {
  try {
    const timedGetter = useTiming
      ? () => {
          const start = performance.now();
          const result = getter();
          const elapsed = performance.now() - start;
          if (elapsed < 0.02) {
            while (performance.now() - start < 0.02) {}
          }
          return result;
        }
      : getter;

    Object.defineProperty(obj, prop, {
      get: timedGetter,
      configurable: true,
      enumerable: true,
    });
  } catch (_) {}
}

let GL_PROTO_PATCHED = false;
function patchGL() {
  if (GL_PROTO_PATCHED) return;
  GL_PROTO_PATCHED = true;

  const glParams: Record<number, string> = {
    0x1f00: "gpuVendor",
    0x9245: "gpuVendor",
    0x1f01: "gpuRenderer",
    0x9246: "gpuRenderer",
    0x86ac: "shortGpu",
    0x8b8d: "shortGpu",
    0x8b8e: "shortGpu",
    0x8d48: "shortGpu",
    0x9247: "gpuVendor",
    0x8b90: "shortGpu",
    0x8b91: "shortGpu",
    0x8b8c: "shortGpu",
    0x8b8f: "shortGpu",
    0x8d07: "shortGpu",
    0x8d08: "shortGpu",
    0x8d09: "shortGpu",
    0x8d10: "shortGpu",
    0x8d11: "shortGpu",
    0x8d12: "shortGpu",
    0x8d13: "shortGpu",
    0x8d20: "shortGpu",
    0x8d21: "shortGpu",
    0x8d22: "shortGpu",
    0x8d23: "shortGpu",
    0x8d24: "shortGpu",
    0x8d25: "shortGpu",
    0x8d26: "shortGpu",
    0x8d27: "shortGpu",
    0x8d28: "shortGpu",
    0x8d29: "shortGpu",
    0x8d2a: "shortGpu",
    0x8d2b: "shortGpu",
    0x8d2c: "shortGpu",
    0x8d2d: "shortGpu",
    0x8d2e: "shortGpu",
    0x8d2f: "shortGpu",
    0x8d30: "shortGpu",
    0x8d31: "shortGpu",
    0x8d32: "shortGpu",
    0x8d33: "shortGpu",
    0x8d34: "shortGpu",
    0x8d35: "shortGpu",
    0x8d36: "shortGpu",
    0x8d37: "shortGpu",
    0x8d38: "shortGpu",
    0x8d39: "shortGpu",
    0x8d3a: "shortGpu",
    0x8d3b: "shortGpu",
    0x8d3c: "shortGpu",
    0x8d3d: "shortGpu",
    0x8d3e: "shortGpu",
    0x8d3f: "shortGpu",
    0x8d40: "shortGpu",
    0x8d41: "shortGpu",
    0x8d42: "shortGpu",
    0x8d43: "shortGpu",
    0x8d44: "shortGpu",
    0x8d45: "shortGpu",
    0x8d46: "shortGpu",
    0x8d47: "shortGpu",
    0x8d49: "shortGpu",
    0x8d4a: "shortGpu",
    0x8d4b: "shortGpu",
    0x8d4c: "shortGpu",
    0x8d4d: "shortGpu",
    0x8d4e: "shortGpu",
    0x8d4f: "shortGpu",
    0x8d50: "shortGpu",
    0x8d51: "shortGpu",
    0x8d52: "shortGpu",
    0x8d53: "shortGpu",
    0x8d54: "shortGpu",
    0x8d55: "shortGpu",
    0x8d56: "shortGpu",
    0x8d57: "shortGpu",
    0x8d58: "shortGpu",
    0x8d59: "shortGpu",
    0x8d5a: "shortGpu",
  };

  [window.WebGLRenderingContext?.prototype, window.WebGL2RenderingContext?.prototype].forEach(
    (proto) => {
      if (!proto?.getParameter) return;
      const orig = proto.getParameter;
      proto.getParameter = function (pname: number) {
        const gpu = p!;
        const key = glParams[pname];
        if (key) {
          return (gpu as any)[key];
        }
        return orig.call(this, pname);
      };
    }
  );
}

let CANVAS_PATCHED = false;
function patchCanvas() {
  if (CANVAS_PATCHED) return;
  CANVAS_PATCHED = true;
  const proto = HTMLCanvasElement.prototype;

  const origToDataURL = proto.toDataURL;
  proto.toDataURL = function (...args: any[]) {
    addNoiseToContext((this as HTMLCanvasElement).getContext("2d"));
    return origToDataURL.apply(this, args as [string?, number?]);
  };

  const origToBlob = proto.toBlob;
  proto.toBlob = function (callback: BlobCallback, ...args: any[]) {
    addNoiseToContext((this as HTMLCanvasElement).getContext("2d"));
    origToBlob.call(this, callback, ...(args as [string?, number?]));
  };

  if (CanvasRenderingContext2D.prototype.getImageData) {
    const origGetImageData = CanvasRenderingContext2D.prototype.getImageData;
    CanvasRenderingContext2D.prototype.getImageData = function (
      ...args: any[]
    ) {
      const imgData = origGetImageData.apply(
        this,
        args as [number, number, number, number],
      );
      applyPixelNoise(imgData);
      return imgData;
    };
  }
}

function addNoiseToContext(ctx: CanvasRenderingContext2D | null) {
  if (!ctx || !p) return;
  const canvas = ctx.canvas;
  applyPixelNoise(ctx.getImageData(0, 0, canvas.width, canvas.height));
}

function perlinNoise2D(x: number, y: number, seed: number): number {
  const perm = new Array(512);
  const rng = new SeededRNG(seed);
  for (let i = 0; i < 256; i++) {
    perm[i] = Math.floor(rng.next() * 256);
    perm[i + 256] = perm[i];
  }

  const X = Math.floor(x) & 255;
  const Y = Math.floor(y) & 255;
  x -= Math.floor(x);
  y -= Math.floor(y);
  const u = fade(x);
  const v = fade(y);

  const A = perm[X] + Y;
  const B = perm[X + 1] + Y;

  return lerp(
    lerp(grad(perm[A], x, y), grad(perm[B], x - 1, y), u),
    lerp(grad(perm[A + 1], x, y - 1), grad(perm[B + 1], x - 1, y - 1), u),
    v
  );
}

function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function lerp(a: number, b: number, t: number): number {
  return a + t * (b - a);
}

function grad(hash: number, x: number, y: number): number {
  const h = hash & 15;
  const u = h < 8 ? x : y;
  const v = h < 4 ? y : h === 12 || h === 14 ? x : 0;
  return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
}

function applyPixelNoise(imgData: ImageData) {
  if (!p) return;
  const seed = blake3seed(p.id + "canvas");
  const data = imgData.data;
  const width = imgData.width;
  const height = imgData.height;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const noise = Math.floor(perlinNoise2D(x * 0.1, y * 0.1, seed) * 4);
      data[i] = Math.max(0, Math.min(255, data[i]! + noise));
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1]! + noise));
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2]! + noise));
    }
  }
}

function createBatteryAPI(batt: HardwareProfile["battery"]) {
  return function () {
    const elapsed = (Date.now() - (p!.createdAt || Date.now())) / 1000;
    const baseLevel = batt.level;
    const level = batt.charging
      ? Math.min(1, baseLevel + elapsed * 0.00001)
      : clamp(Math.max(0.05, baseLevel - elapsed * 0.00001));

    return Promise.resolve({
      charging: batt.charging,
      chargingTime: batt.charging ? 600 : Infinity,
      dischargingTime: batt.charging ? Infinity : 3600,
      level,
      addEventListener() {},
      removeEventListener() {},
      dispatchEvent() {
        return true;
      },
    });
  };
}

function applyProfile(profile: HardwareProfile) {
  p = profile;

  def(Navigator.prototype, "hardwareConcurrency", () => p!.cores);
  def(Navigator.prototype, "maxTouchPoints", () => p!.touchPts);
  def(Navigator.prototype, "platform", () => p!.platform);
  def(Navigator.prototype, "userAgent", () => p!.userAgent);
  def(Navigator.prototype, "appVersion", () =>
    p!.userAgent.replace("Mozilla/", ""),
  );

  if ("deviceMemory" in Navigator.prototype)
    def(Navigator.prototype, "deviceMemory", () => p!.memory);
  if ("oscpu" in Navigator.prototype)
    def(Navigator.prototype, "oscpu", () => p!.oscpu);

  def(Screen.prototype, "width", () => p!.screenW);
  def(Screen.prototype, "height", () => p!.screenH);
  def(Screen.prototype, "availWidth", () => p!.availW);
  def(Screen.prototype, "availHeight", () => p!.availH);
  def(Screen.prototype, "colorDepth", () => p!.colorDepth);
  def(Screen.prototype, "pixelDepth", () => p!.colorDepth);

  Object.defineProperty(window, "devicePixelRatio", {
    get: () => p!.dpr,
    configurable: true,
  });
  def(window, "outerWidth", () => p!.screenW);
  def(window, "outerHeight", () => p!.screenH);
  def(
    window,
    "innerWidth",
    () => p!.screenW - (window.outerWidth - window.innerWidth || 0),
  );
  def(
    window,
    "innerHeight",
    () => p!.screenH - (window.outerHeight - window.innerHeight || 40),
  );

  if (!connectionObj) {
    connectionObj = {
      effectiveType: profile.connectionEffective,
      type: profile.connectionType,
      downlink: profile.downlink,
      rtt: profile.rtt,
      saveData: false,
      addEventListener() {},
      removeEventListener() {},
      dispatchEvent() {
        return true;
      },
    };
    if ("connection" in Navigator.prototype) {
      def(Navigator.prototype, "connection", () => connectionObj);
    }
  }

  try {
    Object.defineProperty(Navigator.prototype, "getBattery", {
      value: createBatteryAPI(profile.battery),
      configurable: true,
      writable: true,
    });
  } catch (_) {}

  patchGL();
  patchCanvas();
}

const unsub = subscribe("maskware-profile", (msg) => {
  if (msg.type === "profile-updated") applyProfile(msg.profile);
});

subscribe("maskware-data", (msg) => {
  if (msg.type === "page-loaded" && p) applyProfile(p);
});

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
  int(min: number, max: number): number {
    return Math.floor(min + this.next() * (max - min + 1));
  }
}

function clamp(val: number): number {
  return Math.max(0.05, Math.min(1.0, val));
}
