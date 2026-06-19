const browser = globalThis.browser || globalThis.chrome;

const FEATURES = ['hardware', 'webrtc', 'fonts', 'av', 'geo', 'locale'];
const DEFAULTS = { hardware:true, webrtc:true, fonts:true, av:true, geo:true, locale:false };

const ELS = {};
const CARDS = {};
const STS = {};
for (const k of FEATURES) {
  ELS[k] = document.getElementById(`t-${k}`);
  CARDS[k] = document.getElementById(`card-${k}`);
  STS[k] = document.getElementById(`s-${k}`);
}

browser.storage.local.get(FEATURES).then((stored) => {
  for (const k of FEATURES) {
    const on = stored[k] !== undefined ? stored[k] : DEFAULTS[k];
    ELS[k].checked = on;
    setCard(k, on);
  }
  updateBadge();
});

for (const k of FEATURES) {
  ELS[k].addEventListener('change', () => {
    const on = ELS[k].checked;
    setCard(k, on);
    browser.runtime.sendMessage({ type:'maskware-toggle', feature:k, enabled:on });
    updateBadge();
  });
}

function setCard(k, on) {
  const c = CARDS[k];
  if (!c) return;
  c.classList.toggle('on', on);
  c.classList.toggle('off', !on);
  if (STS[k]) STS[k].textContent = on ? 'ON' : 'OFF';
}

function updateBadge() {
  const anyOn = FEATURES.some(k => ELS[k].checked);
  const badge = document.getElementById('badge');
  badge.classList.toggle('on', anyOn);
  document.getElementById('badge-txt').textContent = anyOn ? 'ACTIVE' : 'PAUSED';
}

function setVal(id, val) {
  const el = document.getElementById(id); if (!el) return;
  if (val) { el.textContent = val; el.classList.remove('empty'); }
  else     { el.textContent = '—'; el.classList.add('empty'); }
}

function renderProfile(p) {
  if (!p) return;
  setVal('d-gpu',    p.gpu    || null);
  setVal('d-cpu',    p.cores  ? `${p.cores} cores` : null);
  setVal('d-os',     p.platform || null);
  setVal('d-screen', p.screen || null);
  setVal('d-geo',    p.city   ? p.city : (p.lat ? `${p.lat}, ${p.lon}` : null));
}

browser.storage.local.get('lastProfile').then(({ lastProfile }) => {
  renderProfile(lastProfile);
});

document.getElementById('btn-new-id').addEventListener('click', async () => {
  const btn   = document.getElementById('btn-new-id');
  const spin  = document.getElementById('spin-icon');
  const label = document.getElementById('btn-label');

  btn.disabled = true;
  spin.classList.add('loading');
  label.textContent = 'Reloading…';

  try {
    const [tab] = await browser.tabs.query({ active:true, currentWindow:true });
    if (tab) await browser.tabs.reload(tab.id);
  } catch(_) {}

  setTimeout(() => window.close(), 350);
});
