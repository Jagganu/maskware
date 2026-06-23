import type { HardwareProfile } from "../../shared/types";
import { subscribe } from "../../shared/channel";

let profile = {
  timezone: "America/New_York",
  language: "en-US",
  languages: ["en-US", "en"] as string[],
};

try {
  const OrigDTF = Intl.DateTimeFormat;
  function PatchedDTF(this: any, locales: any, options: any) {
    const opts = options ? { ...options } : {};
    if (!opts.timeZone) opts.timeZone = profile.timezone;
    if (!locales) locales = profile.language;
    return new OrigDTF(locales, opts);
  }
  PatchedDTF.prototype = OrigDTF.prototype;
  (PatchedDTF as any).supportedLocalesOf = OrigDTF.supportedLocalesOf;
  (Intl as any).DateTimeFormat = PatchedDTF;
} catch (_) {}

try {
  const origResolved = (Intl.DateTimeFormat as any).prototype.resolvedOptions;
  if (origResolved) {
    (Intl.DateTimeFormat as any).prototype.resolvedOptions = function (
      ...args: any[]
    ) {
      const result = origResolved.apply(this, args);
      result.timeZone = profile.timezone;
      return result;
    };
  }
} catch (_) {}

try {
  const OrigNF = Intl.NumberFormat;
  (Intl as any).NumberFormat = function (
    this: any,
    locales: any,
    options: any,
  ) {
    return new OrigNF(locales || profile.language, options);
  };
  (Intl.NumberFormat as any).prototype = OrigNF.prototype;
  (Intl.NumberFormat as any).supportedLocalesOf = OrigNF.supportedLocalesOf;
} catch (_) {}

try {
  const OrigC = Intl.Collator;
  (Intl as any).Collator = function (this: any, locales: any, options: any) {
    return new OrigC(locales || profile.language, options);
  };
  (Intl.Collator as any).prototype = OrigC.prototype;
  (Intl.Collator as any).supportedLocalesOf = OrigC.supportedLocalesOf;
} catch (_) {}

try {
  const OrigPR = Intl.PluralRules;
  (Intl as any).PluralRules = function (this: any, locales: any, options: any) {
    return new OrigPR(locales || profile.language, options);
  };
  (Intl.PluralRules as any).prototype = OrigPR.prototype;
  (Intl.PluralRules as any).supportedLocalesOf = OrigPR.supportedLocalesOf;
} catch (_) {}

try {
  const OrigRTF = Intl.RelativeTimeFormat;
  (Intl as any).RelativeTimeFormat = function (
    this: any,
    locales: any,
    options: any,
  ) {
    return new OrigRTF(locales || profile.language, options);
  };
  (Intl.RelativeTimeFormat as any).prototype = OrigRTF.prototype;
  (Intl.RelativeTimeFormat as any).supportedLocalesOf =
    OrigRTF.supportedLocalesOf;
} catch (_) {}

try {
  const OrigLF = Intl.ListFormat;
  (Intl as any).ListFormat = function (this: any, locales: any, options: any) {
    return new OrigLF(locales || profile.language, options);
  };
  (Intl.ListFormat as any).prototype = OrigLF.prototype;
  (Intl.ListFormat as any).supportedLocalesOf = OrigLF.supportedLocalesOf;
} catch (_) {}

try {
  Date.prototype.getTimezoneOffset = function () {
    try {
      const tz = this.toLocaleString("en-US", { timeZone: profile.timezone });
      const utc = this.toLocaleString("en-US", { timeZone: "UTC" });
      return (new Date(utc).getTime() - new Date(tz).getTime()) / 60000;
    } catch (_) {
      return 0;
    }
  };
} catch (_) {}

["toLocaleString", "toLocaleDateString", "toLocaleTimeString"].forEach(
  (name) => {
    try {
      const orig = (Date.prototype as any)[name];
      if (!orig) return;
      (Date.prototype as any)[name] = function (locales: any, options: any) {
        if (options?.timeZone) return orig.call(this, locales, options);
        return orig.call(this, locales || profile.language, {
          ...options,
          timeZone: profile.timezone,
        });
      };
    } catch (_) {}
  },
);

try {
  Object.defineProperty(Navigator.prototype, "language", {
    get: () => profile.language,
    configurable: true,
  });
} catch (_) {}

try {
  Object.defineProperty(Navigator.prototype, "languages", {
    get: () => Object.freeze([profile.language, ...profile.languages.slice(1)]),
    configurable: true,
  });
} catch (_) {}

subscribe("maskware-profile", (msg) => {
  if (msg.type === "profile-updated") {
    const p = msg.profile as HardwareProfile;
    profile = {
      timezone: p.timezone,
      language: p.language,
      languages: p.languages,
    };
  }
});
