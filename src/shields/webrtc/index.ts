(() => {
  if (!window.RTCPeerConnection) return;

  const origConstructor = RTCPeerConnection;
  (window as any).RTCPeerConnection = function (config?: RTCConfiguration) {
    return new origConstructor({
      ...config,
      iceTransportPolicy: "relay",
      iceServers: [],
    });
  };
  (window as any).RTCPeerConnection.prototype = origConstructor.prototype;
  Object.defineProperty((window as any).RTCPeerConnection, "prototype", {
    value: origConstructor.prototype,
  });

  const proto = origConstructor.prototype;

  const isLocal = (line: string) =>
    /a=candidate/.test(line) &&
    (/ typ host /.test(line) ||
      / typ srflx /.test(line) ||
      / typ prflx /.test(line));

  function stripLocalCandidates(sdp: string): string {
    return sdp
      .split("\r\n")
      .filter((line) => !(line.startsWith("a=candidate") && isLocal(line)))
      .join("\r\n");
  }

  try {
    const origSP = proto["setLocalDescription"];
    if (origSP) {
      proto["setLocalDescription"] = function (desc: any, ...rest: any[]) {
        if (desc?.sdp && typeof desc.sdp === "string") {
          desc = { ...desc, sdp: stripLocalCandidates(desc.sdp) };
        }
        return (origSP as any).call(this, desc, ...rest);
      };
    }
  } catch (_) {}

  ["createOffer", "createAnswer"].forEach((method) => {
    try {
      const orig = (proto as any)[method];
      if (!orig) return;
      (proto as any)[method] = function (...args: any[]) {
        return orig.apply(this, args).then((desc: any) => {
          desc.sdp = stripLocalCandidates(desc.sdp);
          return desc;
        });
      };
    } catch (_) {}
  });

  [
    "localDescription",
    "currentLocalDescription",
    "pendingLocalDescription",
  ].forEach((prop) => {
    try {
      const desc = Object.getOwnPropertyDescriptor(proto, prop);
      if (!desc?.get) return;
      Object.defineProperty(proto, prop, {
        configurable: true,
        get() {
          const d = desc.get!.call(this);
          if (d?.sdp) d.sdp = stripLocalCandidates(d.sdp);
          return d;
        },
      });
    } catch (_) {}
  });

  try {
    const origGetStats = proto["getStats"];
    if (origGetStats) {
      proto["getStats"] = function (...args: any[]) {
        return (origGetStats as any).call(this, ...args).then((report: any) => {
          if (report.forEach) {
            report.forEach((stat: any) => {
              if (
                stat.type === "local-candidate" ||
                stat.type === "remote-candidate"
              ) {
                delete stat.ip;
                delete stat.address;
                delete stat.port;
                delete stat.candidateType;
                delete stat.transport;
              }
            });
          }
          return report;
        });
      };
    }
  } catch (_) {}

  try {
    const origAddEventListener = proto.addEventListener;
    proto.addEventListener = function (
      this: RTCPeerConnection,
      type: string,
      listener: any,
      options: any,
    ) {
      if (type === "icecandidate") {
        const wrapped = function (this: RTCPeerConnection, event: any) {
          if (event.candidate && isLocal(event.candidate.candidate)) return;
          return listener.call(this, event);
        };
        return origAddEventListener.call(this, type, wrapped, options);
      }
      return origAddEventListener.call(this, type, listener, options);
    };
  } catch (_) {}
})();
