const browser = globalThis.browser || globalThis.chrome;

const FEATURES = {
  hardware: { id: 'maskware-hardware', file: 'inject-hardware.js' },
  webrtc:   { id: 'maskware-webrtc',   file: 'inject-webrtc.js'   },
  fonts:    { id: 'maskware-fonts',    file: 'inject-fonts.js'    },
  av:       { id: 'maskware-av',       file: 'inject-av.js'       },
  geo:      { id: 'maskware-geo',      file: 'inject-geo.js'      },
  locale:   { id: 'maskware-locale',   file: 'inject-locale.js'   },
};

const DEFAULTS = {
  hardware: true, webrtc: true, fonts: true, av: true, geo: true, locale: false,
};

async function registerFeature(key) {
  const f = FEATURES[key];
  try {
    await browser.scripting.registerContentScripts([{
      id: f.id, matches: ['<all_urls>'], js: [f.file],
      runAt: 'document_start', world: 'MAIN', allFrames: true,
    }]);
  } catch(_) {}
}

async function unregisterFeature(key) {
  try { await browser.scripting.unregisterContentScripts({ ids: [FEATURES[key].id] }); } catch(_) {}
}

async function applyAllStates() {
  const keys = Object.keys(DEFAULTS);
  const stored = await browser.storage.local.get(keys);
  for (const key of keys) {
    const on = stored[key] !== undefined ? stored[key] : DEFAULTS[key];
    if (on) await registerFeature(key); else await unregisterFeature(key);
  }
}

browser.runtime.onInstalled.addListener(async () => {
  const keys = Object.keys(DEFAULTS);
  const stored = await browser.storage.local.get(keys);
  const toSet = {};
  for (const key of keys) { if (stored[key] === undefined) toSet[key] = DEFAULTS[key]; }
  if (Object.keys(toSet).length) await browser.storage.local.set(toSet);
  await applyAllStates();
});

browser.runtime.onStartup.addListener(applyAllStates);

browser.runtime.onMessage.addListener((msg) => {
  if (!msg) return;
  if (msg.type === 'maskware-toggle' && FEATURES[msg.feature]) {
    return browser.storage.local
      .set({ [msg.feature]: msg.enabled })
      .then(() => msg.enabled ? registerFeature(msg.feature) : unregisterFeature(msg.feature));
  }
  if (msg.type === 'maskware-profile') {
    return browser.storage.local.set({ lastProfile: msg.data });
  }
});
