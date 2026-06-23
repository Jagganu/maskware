let audioCtx: OfflineAudioContext | null = null;
let noiseCanvas: OffscreenCanvas | null = null;
let noiseCtx: OffscreenCanvasRenderingContext2D | null = null;
let seed: number = 0xdeadbeef;

function xoshiro128() {
  seed ^= seed << 13;
  seed ^= seed >>> 17;
  seed ^= seed << 5;
  return (seed >>> 0) / 0xffffffff;
}

export function initSeed(s: number) {
  seed = s || 0xdeadbeef;
}

export function generatePinkNoise(
  duration: number,
  sampleRate: number,
): Float32Array {
  const length = Math.floor(duration * sampleRate);
  const buffer = new Float32Array(length);
  let b0 = 0;
  let b1 = 0;
  let b2 = 0;
  let b3 = 0;
  let b4 = 0;
  let b5 = 0;
  let b6 = 0;
  for (let i = 0; i < length; i++) {
    const white = (xoshiro128() * 2 - 1) * 0.001;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.969 * b2 + white * 0.153852;
    b3 = 0.8665 * b3 + white * 0.3104856;
    b4 = 0.55 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.016898;
    buffer[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
    buffer[i]! *= 0.11;
    b6 = white * 0.115926;
  }
  return buffer;
}

export function createPinkNoiseBuffer(sampleRate = 48000): AudioBuffer {
  if (!audioCtx) {
    audioCtx = new OfflineAudioContext(1, sampleRate, sampleRate);
  }
  const buffer = audioCtx.createBuffer(1, sampleRate, sampleRate);
  const data = generatePinkNoise(1, sampleRate);
  buffer.copyToChannel(data as Float32Array<ArrayBuffer>, 0);
  return buffer;
}

export function createPerlinNoiseCanvas(
  w: number,
  h: number,
  imgSeed: number,
): ImageData {
  if (!noiseCanvas || noiseCanvas.width !== w || noiseCanvas.height !== h) {
    noiseCanvas = new OffscreenCanvas(w, h);
    noiseCtx = noiseCanvas.getContext("2d")!;
  }
  const imageData = noiseCtx!.createImageData(w, h);
  const pixels = imageData.data;

  const rng = new SeededRNG(imgSeed);
  const perm = new Uint8Array(512);
  for (let i = 0; i < 256; i++) perm[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = rng.int(0, i);
    [perm[i], perm[j]] = [perm[j]!, perm[i]!];
  }
  for (let i = 0; i < 256; i++) perm[i + 256] = perm[i]!;

  const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
  const lerp = (t: number, a: number, b: number) => a + t * (b - a);
  const grad = (hash: number, x: number, y: number) => {
    const h = hash & 3;
    return ((h & 1) === 0 ? x : -x) + ((h & 2) === 0 ? y : -y);
  };

  const scale = 0.02;
  const z = rng.float(0, 1000);

  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      const x = px * scale;
      const y = py * scale;
      const xi = Math.floor(x) & 255;
      const yi = Math.floor(y) & 255;
      const xf = x - Math.floor(x);
      const yf = y - Math.floor(y);
      const u = fade(xf);
      const v = fade(yf);
      const aa = perm[perm[xi]! + yi]!;
      const ab = perm[perm[xi]! + yi + 1]!;
      const ba = perm[perm[xi + 1]! + yi]!;
      const bb = perm[perm[xi + 1]! + yi + 1]!;
      const val = lerp(
        v,
        lerp(u, grad(aa, xf, yf), grad(ba, xf - 1, yf)),
        lerp(u, grad(ab, xf, yf - 1), grad(bb, xf - 1, yf - 1)),
      );
      const noise = Math.floor((val + 1) * 0.5 * 8);
      const idx = (py * w + px) * 4;
      pixels[idx] = noise;
      pixels[idx + 1] = noise;
      pixels[idx + 2] = noise;
      pixels[idx + 3] = noise;
    }
  }
  return imageData;
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
  int(min: number, max: number): number {
    return Math.floor(min + this.next() * (max - min + 1));
  }
  float(min: number, max: number): number {
    return min + this.next() * (max - min);
  }
}

const api = {
  initSeed,
  generatePinkNoise,
  createPinkNoiseBuffer,
  createPerlinNoiseCanvas,
};
Object.assign(self, api);
