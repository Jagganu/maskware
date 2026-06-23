import { h, render } from "preact";
import { useState, useEffect, useCallback } from "preact/hooks";
import "./style.css";
import { SHIELD_META } from "../shared/constants";
import type { ShieldConfig, HardwareProfile } from "../shared/types";
import { Header } from "./components/Header";
import { ShieldList } from "./components/ShieldList";
import { ProfileCard } from "./components/ProfileCard";
import { Footer } from "./components/Footer";

function App() {
  const [config, setConfig] = useState<ShieldConfig>({});
  const [profile, setProfile] = useState<HardwareProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    chrome.storage.local.get(
      Object.keys(SHIELD_META),
      (result: Record<string, boolean | undefined>) => {
        const c: ShieldConfig = {};
        for (const key of Object.keys(SHIELD_META)) {
          const meta = SHIELD_META[key as keyof typeof SHIELD_META]!;
          c[key] = result[key] ?? meta.default;
        }
        setConfig(c);
      },
    );

    chrome.runtime.sendMessage(
      { type: "maskware-get-profile" },
      (response: { profile: HardwareProfile } | undefined) => {
        if (response?.profile) setProfile(response.profile);
        setLoading(false);
      },
    );
  }, []);

  const toggleShield = useCallback((id: string) => {
    setConfig((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      chrome.storage.local.set({ [id]: next[id] });
      chrome.runtime.sendMessage({
        type: "maskware-shield-toggle",
        shieldId: id,
        enabled: next[id],
      });
      return next;
    });
  }, []);

  const newIdentity = useCallback(() => {
    chrome.runtime.sendMessage({ type: "maskware-new-identity" }, () => {
      chrome.runtime.sendMessage(
        { type: "maskware-get-profile" },
        (response: { profile: HardwareProfile } | undefined) => {
          if (response?.profile) setProfile(response.profile);
        },
      );
    });
  }, []);

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "480px",
        }}
      >
        <div class="spinner" />
      </div>
    );
  }

  return (
    <div class="app">
      <Header />
      <ProfileCard profile={profile} onNewIdentity={newIdentity} />
      <ShieldList config={config} onToggle={toggleShield} />
      <Footer profile={profile} />
    </div>
  );
}

render(<App />, document.getElementById("root")!);
