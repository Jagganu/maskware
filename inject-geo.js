(() => {
  'use strict';

  const seedArr = new Uint32Array(2);
  crypto.getRandomValues(seedArr);
  let s0 = seedArr[0] || 0xdeadbeef;
  let s1 = seedArr[1] || 0xcafebabe;

  function rand() {
    s0 ^= s0 << 13; s0 ^= s0 >>> 17; s0 ^= s0 << 5;
    s1 ^= s1 << 13; s1 ^= s1 >>> 17; s1 ^= s1 << 5;
    return (((s0 ^ s1) >>> 0) % 1_000_000) / 1_000_000;
  }

  const CITIES = [
    { city:'London',        lat:51.5074,  lon:-0.1278   },
    { city:'Paris',         lat:48.8566,  lon:2.3522    },
    { city:'New York',      lat:40.7128,  lon:-74.0060  },
    { city:'Tokyo',         lat:35.6762,  lon:139.6503  },
    { city:'Berlin',        lat:52.5200,  lon:13.4050   },
    { city:'Sydney',        lat:-33.8688, lon:151.2093  },
    { city:'San Francisco', lat:37.7749,  lon:-122.4194 },
    { city:'Moscow',        lat:55.7558,  lon:37.6173   },
    { city:'Beijing',       lat:39.9042,  lon:116.4074  },
    { city:'Mumbai',        lat:19.0760,  lon:72.8777   },
    { city:'Singapore',     lat:1.3521,   lon:103.8198  },
    { city:'Rome',          lat:41.9028,  lon:12.4964   },
    { city:'Los Angeles',   lat:34.0522,  lon:-118.2437 },
    { city:'Toronto',       lat:43.6532,  lon:-79.3832  },
    { city:'Dubai',         lat:25.2048,  lon:55.2708   },
    { city:'Seoul',         lat:37.5665,  lon:126.9780  },
    { city:'Buenos Aires',  lat:-34.6037, lon:-58.3816  },
    { city:'Cairo',         lat:30.0444,  lon:31.2357   },
    { city:'Amsterdam',     lat:52.3676,  lon:4.9041    },
    { city:'Chicago',       lat:41.8781,  lon:-87.6298  },
  ];

  const base   = CITIES[Math.floor(rand() * CITIES.length)];
  const jitter = () => (rand() - 0.5) * 0.02;

  const fakeLat = base.lat + jitter();
  const fakeLon = base.lon + jitter();

  const fakePosition = {
    coords: {
      latitude:         fakeLat,
      longitude:        fakeLon,
      altitude:         null,
      accuracy:         15 + Math.floor(rand() * 35),
      altitudeAccuracy: null,
      heading:          null,
      speed:            null,
    },
    timestamp: Date.now(),
  };

  try {
    document.documentElement.setAttribute('data-mw-geo', JSON.stringify({
      city: base.city,
      lat:  fakeLat.toFixed(4),
      lon:  fakeLon.toFixed(4),
    }));
  } catch(_) {}

  const delay = () => 50 + Math.floor(rand() * 200);
  let watchId = 0;

  const overrides = {
    getCurrentPosition(success, error) {
      if (typeof success === 'function') setTimeout(() => success(fakePosition), delay());
    },
    watchPosition(success, error) {
      if (typeof success === 'function') setTimeout(() => success(fakePosition), delay());
      return ++watchId;
    },
    clearWatch() {},
  };

  try {
    if (window.Geolocation) {
      for (const [k, v] of Object.entries(overrides)) {
        Object.defineProperty(Geolocation.prototype, k, { value: v, configurable: true, writable: true });
      }
    }
  } catch(_) {}

  try {
    if (navigator.geolocation && !window.Geolocation) {
      for (const [k, v] of Object.entries(overrides)) {
        Object.defineProperty(navigator.geolocation, k, { value: v, configurable: true, writable: true });
      }
    }
  } catch(_) {}
})();
