(() => {
  'use strict';

  if (!navigator?.mediaDevices) return;

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

  try {
    const g = navigator.mediaDevices;
    const origGUM = g.getUserMedia.bind(g);
    g.getUserMedia = async function (c) {
      try {
        (await origGUM(c)).getTracks().forEach(t => t.stop());
      } catch(_) {}
      return buildFakeStream(c);
    };
    const origGDM = g.getDisplayMedia.bind(g);
    g.getDisplayMedia = async function (c) {
      try {
        (await origGDM(c)).getTracks().forEach(t => t.stop());
      } catch(_) {}
      return buildBlackScreen();
    };
  } catch(_) {}
})();
