(() => {
  'use strict';

  const seedArr = new Uint32Array(1);
  crypto.getRandomValues(seedArr);
  const NOISE = seedArr[0];

  const SAFE = new Set([
    'arial','arial black','comic sans ms','courier new','courier','georgia',
    'helvetica','helvetica neue','impact','times new roman','times',
    'trebuchet ms','verdana','tahoma','palatino','garamond',
    'sans-serif','serif','monospace','cursive','fantasy','system-ui',
    'ui-sans-serif','ui-serif','ui-monospace','ui-rounded',
    '-apple-system','blinkmacsystemfont','segoe ui','roboto','ubuntu',
    'cantarell','open sans','noto sans','liberation sans','freesans',
    'droid sans','droid serif',
  ]);

  function familyFrom(fontStr) {
    if (!fontStr) return '';
    const quoted = fontStr.match(/["']([^"']+)["']/);
    if (quoted) return quoted[1].toLowerCase().trim();
    const sizeIdx = fontStr.search(/\d+(?:\.\d+)?(?:px|pt|em|rem|%|vw|vh)/);
    if (sizeIdx >= 0) {
      const after = fontStr.slice(sizeIdx).replace(/^\S+\s*/, '').trim();
      if (after) return after.split(',')[0].toLowerCase().trim().replace(/['"]/g, '');
    }
    const parts = fontStr.trim().split(/\s+/);
    return parts[parts.length - 1].toLowerCase().replace(/['"]/g, '');
  }

  function isSafe(fontStr) {
    const fam = familyFrom(fontStr);
    return !fam || SAFE.has(fam);
  }

  const origMT = CanvasRenderingContext2D.prototype.measureText;
  CanvasRenderingContext2D.prototype.measureText = function(text) {
    const real = origMT.call(this, text);
    const n = ((NOISE ^ (text.length * 0x9e3779b9)) >>> 0) % 7;
    if (n === 0) return real;
    const delta = n * 0.006;
    return new Proxy(real, {
      get(t, prop, receiver) {
        if (prop === 'width') return t.width + delta;
        const v = Reflect.get(t, prop, receiver);
        return typeof v === 'function' ? v.bind(t) : v;
      },
    });
  };

  if (window.FontFaceSet) {
    const origCheck = FontFaceSet.prototype.check;
    FontFaceSet.prototype.check = function(font, text) {
      if (!isSafe(font)) return false;
      return origCheck.call(this, font, text);
    };

    const origLoad = FontFaceSet.prototype.load;
    FontFaceSet.prototype.load = function(font, text) {
      if (!isSafe(font)) return Promise.resolve([]);
      return origLoad.call(this, font, text);
    };
  }
})();
