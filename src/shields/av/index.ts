(() => {
  if (!window.MediaDevices || !navigator.mediaDevices) return;

  function hashStr(str: string): string {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = (h << 5) - h + str.charCodeAt(i);
      h |= 0;
    }
    return Math.abs(h).toString(16).padStart(8, "0");
  }

  function createFakeTrack(
    kind: "audio" | "video",
    id: string,
  ): MediaStreamTrack {
    const label =
      kind === "audio"
        ? "Default - Microphone (Realtek High Definition Audio)"
        : "USB Camera (Generic HD Webcam)";

    const track: Partial<MediaStreamTrack> = {
      kind,
      id,
      label,
      enabled: true,
      muted: false,
      readyState: "live",
      stop() {},
      getConstraints() {
        return {};
      },
      getSettings() {
        return kind === "audio"
          ? {
              sampleRate: 48000,
              channelCount: 1,
              echoCancellation: true,
              noiseSuppression: true,
            }
          : { width: 640, height: 480, frameRate: 30 };
      },
      getCapabilities() {
        return kind === "audio"
          ? {
              sampleRate: { min: 8000, max: 48000 },
              channelCount: { min: 1, max: 2 },
            }
          : {
              width: { min: 320, max: 1920 },
              height: { min: 240, max: 1080 },
              frameRate: { min: 15, max: 30 },
            };
      },
      applyConstraints() {
        return Promise.resolve();
      },
      addEventListener() {},
      removeEventListener() {},
      dispatchEvent() {
        return true;
      },
      clone() {
        return createFakeTrack(kind, id + "_clone");
      },
    };

    return track as MediaStreamTrack;
  }

  function buildFakeStream(constraints: any): MediaStream {
    const stream = new MediaStream();
    const c = constraints || {};
    const profileId = Date.now().toString(16);

    if (c.audio) {
      try {
        const actx = new AudioContext();
        const dest = actx.createMediaStreamDestination();

        // Generate pink noise at -60dB (realistic noise floor)
        const bufferSize = actx.sampleRate;
        const noiseBuffer = new Float32Array(bufferSize);
        let b0 = 0,
          b1 = 0,
          b2 = 0,
          b3 = 0,
          b4 = 0,
          b5 = 0,
          b6 = 0;
        for (let i = 0; i < bufferSize; i++) {
          const white = (Math.random() * 2 - 1) * 0.001;
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.969 * b2 + white * 0.153852;
          b3 = 0.8665 * b3 + white * 0.3104856;
          b4 = 0.55 * b4 + white * 0.5329522;
          b5 = -0.7616 * b5 - white * 0.016898;
          noiseBuffer[i] =
            (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.0001;
          b6 = white * 0.115926;
        }

        const audioBuffer = actx.createBuffer(1, bufferSize, actx.sampleRate);
        audioBuffer.copyToChannel(noiseBuffer, 0);

        const source = actx.createBufferSource();
        source.buffer = audioBuffer;
        source.loop = true;
        source.connect(dest);
        source.start();

        const track = dest.stream.getAudioTracks()[0];
        if (track) {
          const fakeTrack = createFakeTrack("audio", profileId + ":mic:0");
          const origStop = fakeTrack.stop;
          fakeTrack.stop = () => {
            source.stop();
            actx.close();
            origStop.call(fakeTrack);
          };
          stream.addTrack(fakeTrack);
        }
      } catch (_) {
        /* Fallback: add fake track */
      }
    }

    if (c.video) {
      const vc = typeof c.video === "object" ? c.video : {};
      const w = vc.width?.ideal || vc.width || 640;
      const h = vc.height?.ideal || vc.height || 480;

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;

      // Subtle temporal noise pattern (not solid black)
      function renderFrame() {
        ctx.fillStyle = `rgb(${Math.floor(Math.random() * 5)},${Math.floor(Math.random() * 5)},${Math.floor(Math.random() * 5)})`;
        ctx.fillRect(0, 0, w, h);
      }
      renderFrame();
      setInterval(renderFrame, 1000 / 30);

      const vs = canvas.captureStream(30);
      const track = vs.getVideoTracks()[0];
      if (track) stream.addTrack(track);
    }

    if (stream.getTracks().length === 0) {
      // Add at least one track
      const fakeTrack = createFakeTrack("audio", profileId + ":mic:0");
      stream.addTrack(fakeTrack);
    }

    return stream;
  }

  function buildBlackScreen(): MediaStream {
    const canvas = document.createElement("canvas");
    canvas.width = 1920;
    canvas.height = 1080;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#080808";
    ctx.fillRect(0, 0, 1920, 1080);

    const stream = new MediaStream();
    const vs = canvas.captureStream(1);
    const track = vs.getVideoTracks()[0];
    if (track) stream.addTrack(track);
    return stream;
  }

  const proto = MediaDevices.prototype;

  // getUserMedia - DON'T call real API, return fake stream directly
  if (proto.getUserMedia) {
    proto.getUserMedia = async function (constraints: any) {
      return new Promise((resolve) => {
        const fakeStream = buildFakeStream(constraints || {});
        resolve(fakeStream);
      });
    };
  }

  // getDisplayMedia
  if (proto.getDisplayMedia) {
    proto.getDisplayMedia = async function () {
      return new Promise((resolve) => {
        const fakeStream = buildBlackScreen();
        resolve(fakeStream);
      });
    };
  }

  // enumerateDevices
  try {
    proto.enumerateDevices = async function () {
      const devs: MediaDeviceInfo[] = [
        {
          deviceId: "maskware-audio-0",
          kind: "audioinput",
          label: "Microphone (Realtek High Definition Audio)",
          groupId: "maskware-audio-group",
          toJSON() {
            return {
              deviceId: this.deviceId,
              kind: this.kind,
              label: this.label,
              groupId: this.groupId,
            };
          },
        },
        {
          deviceId: "maskware-audio-1",
          kind: "audiooutput",
          label: "Speakers (Realtek High Definition Audio)",
          groupId: "maskware-audio-group",
          toJSON() {
            return {
              deviceId: this.deviceId,
              kind: this.kind,
              label: this.label,
              groupId: this.groupId,
            };
          },
        },
        {
          deviceId: "maskware-video-0",
          kind: "videoinput",
          label: "USB Camera (Generic HD Webcam)",
          groupId: "maskware-video-group",
          toJSON() {
            return {
              deviceId: this.deviceId,
              kind: this.kind,
              label: this.label,
              groupId: this.groupId,
            };
          },
        },
      ];
      return devs;
    };
  } catch (_) {}
})();
