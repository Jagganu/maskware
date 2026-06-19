(() => {
  'use strict';

  if (!window.MediaDevices || !navigator.mediaDevices) return;

  function buildFakeStream(constraints) {
    const stream = new MediaStream();
    const c = constraints || {};

    if (c.audio) {
      try {
        const actx = new AudioContext();
        const dest = actx.createMediaStreamDestination();
        const track = dest.stream.getAudioTracks()[0];
        if (track) stream.addTrack(track);
      } catch(_) {}
    }

    if (c.video) {
      try {
        const vc = typeof c.video === 'object' ? c.video : {};
        const w = vc.width?.ideal  || vc.width  || 640;
        const h = vc.height?.ideal || vc.height || 480;
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, w, h);
        const track = canvas.captureStream(0).getVideoTracks()[0];
        if (track) stream.addTrack(track);
      } catch(_) {}
    }

    return stream;
  }

  function buildBlackScreen() {
    const canvas = document.createElement('canvas');
    canvas.width = 1920; canvas.height = 1080;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, 1920, 1080);
    ctx.fillStyle = '#2a2a2a';
    ctx.font = 'bold 26px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Screen capture blocked by Maskware', 960, 540);
    const stream = new MediaStream();
    try {
      const track = canvas.captureStream(0).getVideoTracks()[0];
      if (track) stream.addTrack(track);
    } catch(_) {}
    return stream;
  }

  const proto = MediaDevices.prototype;

  if (proto.getUserMedia) {
    const origGUM = proto.getUserMedia;
    proto.getUserMedia = async function(constraints) {
      try {
        const real = await origGUM.call(this, constraints);
        real.getTracks().forEach(t => t.stop());
      } catch(_) {}
      return buildFakeStream(constraints || {});
    };
  }

  if (proto.getDisplayMedia) {
    const origGDM = proto.getDisplayMedia;
    proto.getDisplayMedia = async function(constraints) {
      try {
        const real = await origGDM.call(this, constraints);
        real.getTracks().forEach(t => t.stop());
      } catch(_) {}
      return buildBlackScreen();
    };
  }
})();
