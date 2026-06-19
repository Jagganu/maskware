(() => {
  'use strict';

  if (!window.RTCPeerConnection) return;
  const proto = RTCPeerConnection.prototype;

  const isSrflx = (candidateLine) =>
    typeof candidateLine === 'string' && / typ srflx /.test(candidateLine);

  function stripSrflx(sdp) {
    if (typeof sdp !== 'string') return sdp;
    return sdp
      .split('\r\n')
      .filter((line) => !(line.startsWith('a=candidate') && isSrflx(line)))
      .join('\r\n');
  }

  try {
    const desc = Object.getOwnPropertyDescriptor(proto, 'onicecandidate');
    if (desc && desc.set) {
      Object.defineProperty(proto, 'onicecandidate', {
        configurable: true,
        get: desc.get,
        set(handler) {
          desc.set.call(this, function (event) {
            if (event.candidate && isSrflx(event.candidate.candidate)) return;
            return handler.call(this, event);
          });
        },
      });
    }
  } catch (err) {}

  try {
    const origAdd = proto.addEventListener;
    proto.addEventListener = function (type, listener, options) {
      if (type === 'icecandidate' && typeof listener === 'function') {
        const wrapped = function (event) {
          if (event.candidate && isSrflx(event.candidate.candidate)) return;
          return listener.call(this, event);
        };
        return origAdd.call(this, type, wrapped, options);
      }
      return origAdd.call(this, type, listener, options);
    };
  } catch (err) {}

  ['createOffer', 'createAnswer'].forEach((method) => {
    try {
      const orig = proto[method];
      if (!orig) return;
      proto[method] = function (...args) {
        return orig.apply(this, args).then((desc) => {
          desc.sdp = stripSrflx(desc.sdp);
          return desc;
        });
      };
    } catch (err) {}
  });

  try {
    const origSetLocal = proto.setLocalDescription;
    proto.setLocalDescription = function (description, ...rest) {
      if (description && typeof description.sdp === 'string') {
        description = Object.assign({}, description, { sdp: stripSrflx(description.sdp) });
      }
      return origSetLocal.call(this, description, ...rest);
    };
  } catch (err) {}
})();
