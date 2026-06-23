(() => {
  'use strict';

  if (!navigator?.mediaDevices) return;

  const origGUM = MediaDevices.prototype.getUserMedia;
  const origGDM = MediaDevices.prototype.getDisplayMedia;
  const origEnum = MediaDevices.prototype.enumerateDevices;

  const LABEL_MAP = { audioinput: 'Microphone', videoinput: 'Camera', audiooutput: 'Speaker' };

  async function enumOverride() {
    try {
      const devices = await origEnum.call(navigator.mediaDevices);
      const counts = {};
      for (const d of devices) {
        const label = LABEL_MAP[d.kind];
        if (label) {
          counts[label] = (counts[label] || 0) + 1;
          try { Object.defineProperty(d, 'label', { value: counts[label] > 1 ? `${label} ${counts[label]}` : label, configurable: true }); } catch(_) {}
        }
      }
      return devices;
    } catch(_) { return []; }
  }

  function buildFakeStream(constraints) {
    const stream = new MediaStream();
    const c = constraints || {};

    if (c.audio) {
      try {
        const actx = new AudioContext();
        const dest = actx.createMediaStreamDestination();
        const osc = actx.createOscillator();
        osc.frequency.value = 0;
        osc.connect(dest);
        osc.start();
        const t = dest.stream.getAudioTracks()[0];
        if (t) stream.addTrack(t);
      } catch(_) {}
    }

    if (c.video) {
      try {
        const vc = typeof c.video === 'object' ? c.video : {};
        const w = vc.width?.ideal || vc.width || 640;
        const h = vc.height?.ideal || vc.height || 480;
        const canvas = Object.assign(document.createElement('canvas'), { width: w, height: h });
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, w, h);
        const t = canvas.captureStream(30).getVideoTracks()[0];
        if (t) stream.addTrack(t);
      } catch(_) {}
    }

    return stream;
  }

  function buildBlackScreen() {
    const canvas = Object.assign(document.createElement('canvas'), { width: 1920, height: 1080 });
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, 1920, 1080);
    ctx.fillStyle = '#222';
    ctx.font = 'bold 26px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Blocked by Maskware', 960, 540);
    try {
      const stream = new MediaStream();
      const t = canvas.captureStream(30).getVideoTracks()[0];
      if (t) stream.addTrack(t);
      return stream;
    } catch(_) { return new MediaStream(); }
  }

  async function gumOverride(c) {
    try {
      (await origGUM.call(navigator.mediaDevices, c)).getTracks().forEach(t => t.stop());
    } catch(_) {}
    return buildFakeStream(c);
  }

  async function gdmOverride(c) {
    try {
      (await origGDM.call(navigator.mediaDevices, c)).getTracks().forEach(t => t.stop());
    } catch(_) {}
    return buildBlackScreen();
  }

  if (window.MediaDevices) {
    try { Object.defineProperty(MediaDevices.prototype, 'getUserMedia', { value: gumOverride, configurable: true, writable: true }); } catch(_) {}
    try { Object.defineProperty(MediaDevices.prototype, 'getDisplayMedia', { value: gdmOverride, configurable: true, writable: true }); } catch(_) {}
    try { Object.defineProperty(MediaDevices.prototype, 'enumerateDevices', { value: enumOverride, configurable: true, writable: true }); } catch(_) {}
  }
  try { Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { value: gumOverride, configurable: true, writable: true }); } catch(_) {}
  try { Object.defineProperty(navigator.mediaDevices, 'getDisplayMedia', { value: gdmOverride, configurable: true, writable: true }); } catch(_) {}
  try { Object.defineProperty(navigator.mediaDevices, 'enumerateDevices', { value: enumOverride, configurable: true, writable: true }); } catch(_) {}
})();
