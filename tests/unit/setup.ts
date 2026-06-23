import { vi } from 'vitest';

Object.defineProperty(globalThis, 'chrome', {
  value: {
    storage: {
      local: {
        get: vi.fn((keys, cb) => cb({})),
        set: vi.fn((obj, cb) => cb && cb()),
      },
    },
    runtime: {
      onInstalled: { addListener: vi.fn() },
      onStartup: { addListener: vi.fn() },
      onMessage: { addListener: vi.fn() },
      sendMessage: vi.fn((msg, cb) => cb && cb({})),
    },
    offscreen: {
      hasDocument: vi.fn().mockResolvedValue(false),
      createDocument: vi.fn().mockResolvedValue(undefined),
    },
    webNavigation: {
      onBeforeNavigate: { addListener: vi.fn() },
    },
    declarativeNetRequest: {
      updateDynamicRules: vi.fn(),
    },
  },
  writable: true,
});

Object.defineProperty(globalThis, 'broadcastChannel', {
  value: class BroadcastChannel {
    name: string;
    constructor(name: string) { this.name = name; }
    postMessage() {}
    addEventListener() {}
    removeEventListener() {}
    close() {}
  },
  writable: true,
});

const mockRNG = {
  state: 1,
  next() { this.state = (this.state * 1664525 + 1013904223) >>> 0; return this.state / 0xffffffff; },
  int(min: number, max: number) { return Math.floor(min + this.next() * (max - min + 1)); },
  float(min: number, max: number) { return min + this.next() * (max - min); },
};

vi.stubGlobal('crypto', {
  getRandomValues: (arr: Uint32Array) => { arr[0] = 12345; return arr; },
  subtle: {},
});

vi.stubGlobal('SeededRNG', mockRNG);
