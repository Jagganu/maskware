(() => {
  if ((window as any).__maskware_seeded) return;
  (window as any).__maskware_seeded = 1;

  const S = Symbol.for;
  const P = Object.defineProperty;
  const nav = navigator;
  const scr = screen;
  let navProxy: any = null;
  let scrProxy: any = null;

  try {
    P(window, "navigator", {
      get() {
        if (!navProxy) {
          navProxy = new Proxy(nav, {
            get(_: any, prop: string) {
              const k = (nav as any)[S("mw_" + prop)];
              if (k !== undefined) return k;
              return Reflect.get(nav, prop);
            },
          });
        }
        return navProxy;
      },
      configurable: true,
      enumerable: true,
    });
  } catch (_) {}

  try {
    P(window, "screen", {
      get() {
        if (!scrProxy) {
          scrProxy = new Proxy(scr, {
            get(_: any, prop: string) {
              const k = (scr as any)[S("mw_" + prop)];
              if (k !== undefined) return k;
              return Reflect.get(scr, prop);
            },
          });
        }
        return scrProxy;
      },
      configurable: true,
      enumerable: true,
    });
  } catch (_) {}

  (window as any).__maskware_ready = true;
})();
