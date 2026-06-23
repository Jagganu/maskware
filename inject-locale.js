(() => {
  'use strict';

  const FAKE_TIMEZONE = 'UTC';
  const FAKE_LOCALE = 'en-US';

  const NativeDTF = Intl.DateTimeFormat;
  function PatchedDTF(locales, options) {
    const opts = options ? Object.assign({}, options) : {};
    if (!opts.timeZone) opts.timeZone = FAKE_TIMEZONE;
    return new NativeDTF(locales, opts);
  }
  PatchedDTF.prototype = NativeDTF.prototype;
  PatchedDTF.supportedLocalesOf = NativeDTF.supportedLocalesOf;
  try { Intl.DateTimeFormat = PatchedDTF; } catch (err) {}

  try {
    const origResolved = NativeDTF.prototype.resolvedOptions;
    NativeDTF.prototype.resolvedOptions = function (...args) {
      const result = origResolved.apply(this, args);
      result.timeZone = FAKE_TIMEZONE;
      return result;
    };
  } catch (err) {}

  try {
    Date.prototype.getTimezoneOffset = function () { return 0; };
  } catch (err) {}

  function wrapLocaleMethod(name) {
    const orig = Date.prototype[name];
    if (!orig) return;
    try {
      Date.prototype[name] = function (locales, options) {
        if (options && options.timeZone) return orig.call(this, locales, options);
        const opts = Object.assign({}, options, { timeZone: FAKE_TIMEZONE });
        return orig.call(this, locales || FAKE_LOCALE, opts);
      };
    } catch (err) {}
  }
  ['toLocaleString', 'toLocaleDateString', 'toLocaleTimeString'].forEach(wrapLocaleMethod);

  try {
    Object.defineProperty(Navigator.prototype, 'language', {
      get: () => FAKE_LOCALE,
      configurable: true,
    });
  } catch (err) {}
  try {
    Object.defineProperty(Navigator.prototype, 'languages', {
      get: () => Object.freeze([FAKE_LOCALE, 'en']),
      configurable: true,
    });
  } catch (err) {}
})();
