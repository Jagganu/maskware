(() => {
  const PluginArrayProto =
    (navigator.plugins as any)?.constructor?.prototype || PluginArray.prototype;
  const MimeTypeArrayProto =
    (navigator.mimeTypes as any)?.constructor?.prototype ||
    MimeTypeArray.prototype;

  function makePluginArray(): PluginArray {
    const arr: any = [];
    (arr as any).item = (i: number) => arr[i] || null;
    (arr as any).namedItem = () => null;
    (arr as any).refresh = () => {};
    arr.length = 0;
    Object.setPrototypeOf(arr, PluginArrayProto);
    return arr as PluginArray;
  }

  function makeMimeTypeArray(): MimeTypeArray {
    const arr: any = [];
    (arr as any).item = (i: number) => arr[i] || null;
    (arr as any).namedItem = () => null;
    arr.length = 0;
    Object.setPrototypeOf(arr, MimeTypeArrayProto);
    return arr as MimeTypeArray;
  }

  try {
    Object.defineProperty(Navigator.prototype, "plugins", {
      get: makePluginArray,
      configurable: true,
    });
  } catch (_) {}

  try {
    Object.defineProperty(Navigator.prototype, "mimeTypes", {
      get: makeMimeTypeArray,
      configurable: true,
    });
  } catch (_) {}

  // Override navigator.vendor
  try {
    Object.defineProperty(Navigator.prototype, "vendor", {
      get: () => "Google Inc.",
      configurable: true,
    });
  } catch (_) {}

  // Override navigator.product
  try {
    Object.defineProperty(Navigator.prototype, "product", {
      get: () => "Gecko",
      configurable: true,
    });
  } catch (_) {}

  // Override navigator.productSub (build date of browser)
  try {
    Object.defineProperty(Navigator.prototype, "productSub", {
      get: () => "20030107",
      configurable: true,
    });
  } catch (_) {}

  // Override navigator.vendorSub
  try {
    Object.defineProperty(Navigator.prototype, "vendorSub", {
      get: () => "",
      configurable: true,
    });
  } catch (_) {}

  // Override navigator.appCodeName
  try {
    Object.defineProperty(Navigator.prototype, "appCodeName", {
      get: () => "Mozilla",
      configurable: true,
    });
  } catch (_) {}

  // Override navigator.appName
  try {
    Object.defineProperty(Navigator.prototype, "appName", {
      get: () => "Netscape",
      configurable: true,
    });
  } catch (_) {}

  // Override navigator.doNotTrack
  try {
    Object.defineProperty(Navigator.prototype, "doNotTrack", {
      get: () => "1",
      configurable: true,
    });
  } catch (_) {}

  // Override navigator.cookieEnabled
  try {
    Object.defineProperty(Navigator.prototype, "cookieEnabled", {
      get: () => true,
      configurable: true,
    });
  } catch (_) {}

  // Override navigator.onLine
  try {
    Object.defineProperty(Navigator.prototype, "onLine", {
      get: () => true,
      configurable: true,
    });
  } catch (_) {}
})();
