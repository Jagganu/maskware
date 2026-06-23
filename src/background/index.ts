import { ensureProfile, regenerateProfile } from "../shared/profile-db";
import { publish, subscribe, cleanup } from "../shared/channel";
import { deriveProfile } from "../shared/profiles";
import type { ShieldConfig } from "../shared/types";

const FEATURES: Record<string, string> = {
  hardware: "hardware",
  webrtc: "webrtc",
  fonts: "fonts",
  av: "av",
  geo: "geo",
  locale: "locale",
  "css-media": "css-media",
  permissions: "permissions",
  plugins: "plugins",
};

const DEFAULTS: ShieldConfig = {
  hardware: true,
  webrtc: true,
  fonts: true,
  av: true,
  geo: true,
  locale: false,
  "css-media": true,
  permissions: true,
  plugins: true,
};

async function loadShieldConfig(): Promise<ShieldConfig> {
  return new Promise((resolve) => {
    chrome.storage.local.get(
      Object.keys(FEATURES),
      (result: Record<string, boolean | undefined>) => {
        const config: Record<string, boolean> = { ...DEFAULTS };
        for (const key of Object.keys(FEATURES)) {
          if (result[key] !== undefined) config[key] = result[key]!;
        }
        resolve(config);
      },
    );
  });
}

async function setupOffscreen(): Promise<void> {
  try {
    const hasDoc = await chrome.offscreen.hasDocument?.();
    if (!hasDoc) {
      await chrome.offscreen.createDocument({
        url: "offscreen.html",
        reasons: [
          "AUDIO_PLAYBACK",
          "VIDEO_PLAYBACK",
        ] as chrome.offscreen.Reason[],
        justification:
          "Required for canvas and audio fingerprinting operations",
      });
    }
  } catch (_) {}
}

async function initializeProfile(): Promise<void> {
  const profile = await ensureProfile();
  publish("maskware-profile", { type: "profile-updated", profile });
}

async function handleNewIdentity(): Promise<void> {
  const profile = await regenerateProfile();
  publish("maskware-profile", { type: "profile-updated", profile });
}

chrome.runtime.onInstalled.addListener(async () => {
  const config = await loadShieldConfig();
  await chrome.storage.local.set(config);
  await initializeProfile();
  await setupOffscreen();
  await injectSeedScript();
  publish("maskware-cmd", { type: "cmd-reload-settings" });
});

chrome.runtime.onStartup.addListener(async () => {
  await initializeProfile();
  await setupOffscreen();
  await injectSeedScript();
  publish("maskware-cmd", { type: "cmd-reload-settings" });
});

async function injectSeedScript(): Promise<void> {
  try {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (tab.id) {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id, allFrames: true },
          files: ["seed.js"],
          world: "MAIN",
        });
      }
    }
  } catch (_) {}
}

chrome.runtime.onMessage.addListener((msg: any, _sender, _sendResponse) => {
  if (!msg) return false;

  if (msg.type === "maskware-new-identity") {
    handleNewIdentity().catch(() => {});
    return true;
  }

  if (msg.type === "maskware-get-profile") {
    ensureProfile()
      .then((profile) => {
        _sendResponse({ profile });
      })
      .catch(() => _sendResponse(null));
    return true;
  }

  return false;
});

chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
  if (details.frameId === 0) {
    await injectSeedScript();
    const baseProfile = await ensureProfile();
    const derivedProfile = deriveProfile(baseProfile, new URL(details.url).origin);
    publish("maskware-profile", { type: "profile-updated", profile: derivedProfile });
    publish("maskware-data", {
      type: "page-loaded",
      origin: new URL(details.url).origin,
      url: details.url,
    });
  }
});

self.addEventListener("beforeunload", () => {
  cleanup();
});
