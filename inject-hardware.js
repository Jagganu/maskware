(() => {
  'use strict';

  const seedArr = new Uint32Array(2);
  crypto.getRandomValues(seedArr);
  let s0 = seedArr[0] || 0x9e3779b9;
  let s1 = seedArr[1] || 0x85ebca6b;

  function rand() {
    s0 ^= s0 << 13; s0 ^= s0 >>> 17; s0 ^= s0 << 5;
    s1 ^= s1 << 13; s1 ^= s1 >>> 17; s1 ^= s1 << 5;
    return (((s0 ^ s1) >>> 0) % 1_000_000) / 1_000_000;
  }
  const pick = (a) => a[Math.floor(rand() * a.length)];
  const between = (mn, mx) => Math.floor(mn + rand() * (mx - mn + 1));

  const GPU_PROFILES = [
    { vendor: 'Google Inc. (Intel)',  renderer: 'ANGLE (Intel, Mesa Intel(R) UHD Graphics (CML GT2), OpenGL 4.6)' },
    { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA, NVIDIA GeForce GTX 1660 Direct3D11 vs_5_0 ps_5_0, D3D11)' },
    { vendor: 'Google Inc. (AMD)',    renderer: 'ANGLE (AMD, AMD Radeon RX 580 Series Direct3D11 vs_5_0 ps_5_0, D3D11)' },
    { vendor: 'Mozilla',              renderer: 'Mesa Intel(R) Iris(R) Xe Graphics (TGL GT2)' },
    { vendor: 'Mozilla',              renderer: 'AMD Radeon Graphics (radeonsi, raphael, ACO, DRM 3.54)' },
    { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)' },
    { vendor: 'Google Inc. (AMD)',    renderer: 'ANGLE (AMD, AMD Radeon RX 6700 XT Direct3D11 vs_5_0 ps_5_0, D3D11)' },
  ];
  const PLATFORMS   = ['Win32', 'Linux x86_64', 'MacIntel'];
  const OSCPUS      = ['Windows NT 10.0; Win64; x64', 'Linux x86_64', 'Intel Mac OS X 10.15'];
  const RESOLUTIONS = [[1920,1080],[1366,768],[1536,864],[2560,1440],[1280,720],[1440,900]];
  const CORES       = [4, 6, 8, 12, 16];
  const MEMORIES    = [4, 8, 16];
  const CONN_EFF    = ['4g','4g','4g','3g'];
  const CONN_TYPE   = ['wifi','wifi','cellular'];

  const p = {
    cores:      pick(CORES),
    gpu:        pick(GPU_PROFILES),
    platform:   pick(PLATFORMS),
    oscpu:      pick(OSCPUS),
    res:        pick(RESOLUTIONS),
    touchPts:   rand() < 0.15 ? between(1,5) : 0,
    canvasSalt: between(1,251),
    audioNoise: rand() * 0.00008 + 0.00002,
    memory:     pick(MEMORIES),
    connEff:    pick(CONN_EFF),
    connType:   pick(CONN_TYPE),
    connDown:   between(5, 100),
    connRtt:    between(10, 100),
    battCharge: rand() > 0.4,
    battLevel:  0.2 + rand() * 0.8,
    battTime:   between(7200, 18000),
  };

  function def(obj, prop, getter) {
    try { Object.defineProperty(obj, prop, { get: getter, configurable: true }); } catch(_) {}
  }

  def(Navigator.prototype, 'hardwareConcurrency', () => p.cores);
  def(Navigator.prototype, 'maxTouchPoints',      () => p.touchPts);
  if ('deviceMemory' in Navigator.prototype)
    def(Navigator.prototype, 'deviceMemory', () => p.memory);

  def(Navigator.prototype, 'platform', () => p.platform);
  if ('oscpu' in Navigator.prototype)
    def(Navigator.prototype, 'oscpu', () => p.oscpu);

  const [fw, fh] = p.res;
  def(Screen.prototype, 'width',       () => fw);
  def(Screen.prototype, 'height',      () => fh);
  def(Screen.prototype, 'availWidth',  () => fw);
  def(Screen.prototype, 'availHeight', () => fh - 40);
  def(Screen.prototype, 'colorDepth',  () => 24);
  def(Screen.prototype, 'pixelDepth',  () => 24);
  def(window,           'devicePixelRatio', () => 1);

  function patchGL(proto) {
    if (!proto?.getParameter) return;
    const origGP = proto.getParameter;
    proto.getParameter = function(pname) {
      if (pname === 0x1f00 || pname === 0x9245) return p.gpu.vendor;
      if (pname === 0x1f01 || pname === 0x9246) return p.gpu.renderer;
      return origGP.call(this, pname);
    };
    if (!proto.readPixels) return;
    const origRP = proto.readPixels;
    proto.readPixels = function(...a) {
      const r = origRP.apply(this, a);
      const px = a[6];
      if (px?.length) for (let i = 0; i < px.length; i += 97) px[i] = (px[i] ^ 1) & 0xff;
      return r;
    };
  }
  patchGL(window.WebGLRenderingContext?.prototype);
  patchGL(window.WebGL2RenderingContext?.prototype);

  function noisePixels(id) {
    const d = id.data;
    for (let i = 0; i < d.length; i += 4) {
      if ((i + p.canvasSalt) % 7 === 0) d[i] ^= 1;
    }
  }
  const origGID = CanvasRenderingContext2D.prototype.getImageData;
  CanvasRenderingContext2D.prototype.getImageData = function(...a) {
    const r = origGID.apply(this, a);
    try { noisePixels(r); } catch(_) {}
    return r;
  };
  function noiseCV(cv) {
    if (!(cv.width > 0 && cv.height > 0)) return;
    const ctx = cv.getContext?.('2d'); if (!ctx) return;
    try { ctx.putImageData(ctx.getImageData(0,0,cv.width,cv.height), 0, 0); } catch(_) {}
  }
  const origTDU = HTMLCanvasElement.prototype.toDataURL;
  HTMLCanvasElement.prototype.toDataURL = function(...a) { noiseCV(this); return origTDU.apply(this,a); };
  const origTB = HTMLCanvasElement.prototype.toBlob;
  HTMLCanvasElement.prototype.toBlob = function(...a) { noiseCV(this); return origTB.apply(this,a); };

  if (window.AudioBuffer) {
    const origGCD = AudioBuffer.prototype.getChannelData;
    AudioBuffer.prototype.getChannelData = function(ch) {
      const d = origGCD.call(this, ch);
      for (let i = 0; i < d.length; i += 100) d[i] += p.audioNoise * (i % 200 === 0 ? 1 : -1);
      return d;
    };
  }
  if (window.AnalyserNode) {
    const origFFT = AnalyserNode.prototype.getFloatFrequencyData;
    AnalyserNode.prototype.getFloatFrequencyData = function(arr) {
      origFFT.call(this, arr);
      for (let i = 0; i < arr.length; i++) arr[i] += p.audioNoise * 1000;
    };
  }

  if ('connection' in Navigator.prototype) {
    const fakeConn = {
      effectiveType: p.connEff, type: p.connType,
      downlink: p.connDown, rtt: p.connRtt, saveData: false,
      addEventListener(){}, removeEventListener(){}, dispatchEvent(){ return true; },
    };
    def(Navigator.prototype, 'connection', () => fakeConn);
  }

  try {
    const battLevel = p.battLevel;
    const fakeBat = {
      charging: p.battCharge,
      chargingTime: p.battCharge ? between(300, 3600) : Infinity,
      dischargingTime: p.battCharge ? Infinity : p.battTime,
      level: battLevel,
      addEventListener(){}, removeEventListener(){}, dispatchEvent(){ return true; },
    };
    Object.defineProperty(Navigator.prototype, 'getBattery', {
      value: function() { return Promise.resolve(fakeBat); },
      configurable: true, writable: true,
    });
  } catch(_) {}

  function shortGPU(renderer) {
    if (renderer.startsWith('ANGLE (')) {
      const inner = renderer.slice(7, -1);
      const parts = inner.split(', ');
      if (parts.length >= 2) {
        return parts[1]
          .replace(/^(NVIDIA|AMD|Intel\(R\)|Mesa Intel\(R\)|Mesa)\s+/i, '')
          .replace(/\s+Direct3D.*$/i, '')
          .replace(/\s+OpenGL.*$/i, '')
          .replace(/\(R\)/g, '')
          .replace(/\s*\([^)]*\)\s*$/, '')
          .trim();
      }
    }
    return renderer
      .replace(/\(R\)/g, '').replace(/\([^)]*\)/g, '')
      .replace(/,.*/, '').replace(/^\s*Mesa\s*/i, '').trim();
  }

  try {
    document.documentElement.setAttribute('data-mw-hw', JSON.stringify({
      gpu:      shortGPU(p.gpu.renderer),
      cores:    p.cores,
      platform: p.platform,
      screen:   `${fw}×${fh}`,
      memory:   p.memory,
    }));
  } catch(_) {}
})();
