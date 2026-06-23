(function () {
  'use strict';

  const browser = globalThis.browser || globalThis.chrome;

  function relay() {
    try {
      const hwRaw  = document.documentElement.getAttribute('data-mw-hw');
      const geoRaw = document.documentElement.getAttribute('data-mw-geo');
      if (!hwRaw && !geoRaw) return;

      const hw  = hwRaw  ? JSON.parse(hwRaw)  : {};
      const geo = geoRaw ? JSON.parse(geoRaw) : {};

      browser.runtime.sendMessage({
        type: 'maskware-profile',
        data: {
          gpu:      hw.gpu      || null,
          cores:    hw.cores    || null,
          platform: hw.platform || null,
          screen:   hw.screen   || null,
          memory:   hw.memory   || null,
          city:     geo.city    || null,
          lat:      geo.lat     || null,
          lon:      geo.lon     || null,
        },
      }).catch(() => {});
    } catch (_) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', relay, { once: true });
  } else {
    relay();
  }
}());
