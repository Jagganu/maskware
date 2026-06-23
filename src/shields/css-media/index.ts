(() => {
  const origMatchMedia = window.matchMedia.bind(window);

  window.matchMedia = function (query: string): MediaQueryList {
    const spoofed: Record<string, { matches: boolean; media: string }> = {
      "(prefers-color-scheme: dark)": {
        matches: true,
        media: "(prefers-color-scheme: dark)",
      },
      "(prefers-color-scheme: light)": {
        matches: false,
        media: "(prefers-color-scheme: light)",
      },
      "(prefers-reduced-motion: reduce)": {
        matches: false,
        media: "(prefers-reduced-motion: reduce)",
      },
      "(prefers-reduced-motion: no-preference)": {
        matches: true,
        media: "(prefers-reduced-motion: no-preference)",
      },
      "(prefers-contrast: high)": {
        matches: false,
        media: "(prefers-contrast: high)",
      },
      "(prefers-contrast: no-preference)": {
        matches: true,
        media: "(prefers-contrast: no-preference)",
      },
      "(prefers-reduced-transparency: reduce)": {
        matches: false,
        media: "(prefers-reduced-transparency: reduce)",
      },
      "(prefers-reduced-transparency: no-preference)": {
        matches: true,
        media: "(prefers-reduced-transparency: no-preference)",
      },
      "(prefers-reduced-data: reduce)": {
        matches: false,
        media: "(prefers-reduced-data: reduce)",
      },
      "(prefers-reduced-data: no-preference)": {
        matches: true,
        media: "(prefers-reduced-data: no-preference)",
      },
      "(forced-colors: active)": {
        matches: false,
        media: "(forced-colors: active)",
      },
      "(forced-colors: none)": {
        matches: true,
        media: "(forced-colors: none)",
      },
      "(pointer: coarse)": { matches: false, media: "(pointer: coarse)" },
      "(pointer: fine)": { matches: true, media: "(pointer: fine)" },
      "(any-pointer: coarse)": {
        matches: false,
        media: "(any-pointer: coarse)",
      },
      "(any-pointer: fine)": { matches: true, media: "(any-pointer: fine)" },
      "(hover: hover)": { matches: true, media: "(hover: hover)" },
      "(hover: none)": { matches: false, media: "(hover: none)" },
      "(any-hover: hover)": { matches: true, media: "(any-hover: hover)" },
      "(any-hover: none)": { matches: false, media: "(any-hover: none)" },
    };

    const spoof = spoofed[query];
    if (spoof) {
      const result = origMatchMedia(query);
      return {
        ...result,
        matches: spoof.matches,
        media: spoof.media as string,
        addEventListener(type: string, listener: any) {
          result.addEventListener(type, listener);
        },
        removeEventListener(type: string, listener: any) {
          result.removeEventListener(type, listener);
        },
      } as MediaQueryList;
    }

    return origMatchMedia(query);
  };

  // CSS font availability - block font probing
  try {
    const orig = CSS.supports.bind(CSS);
    CSS.supports = function (conditionText: string) {
      if (/font-family/.test(conditionText)) return false;
      return orig(conditionText);
    } as any;
  } catch (_) {}
})();
