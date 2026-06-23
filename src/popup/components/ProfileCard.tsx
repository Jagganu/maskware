import { h, FunctionalComponent } from "preact";
import type { HardwareProfile } from "../../shared/types";

interface Props {
  profile: HardwareProfile | null;
  onNewIdentity: () => void;
}

function fingerprintHash(profile: HardwareProfile | null): string {
  if (!profile) return "--------";
  const raw = `${profile.id}-${profile.cores}-${profile.screenW}x${profile.screenH}-${profile.gpuRenderer}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    hash = ((hash << 5) - hash + raw.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(16).padStart(8, "0").slice(0, 8);
}

export const ProfileCard: FunctionalComponent<Props> = ({
  profile,
  onNewIdentity,
}) => {
  const hash = fingerprintHash(profile);
  const shieldCount = profile ? 9 : 0;

  return (
    <div class="profile-card">
      <div class="profile-hash">
        <span class="hash-label">Identity</span>
        <code class="hash-value">{hash}</code>
      </div>
      {profile && (
        <div class="profile-meta">
          <span class="meta-item">{profile.platform}</span>
          <span class="meta-sep">|</span>
          <span class="meta-item">{profile.cores} cores</span>
          <span class="meta-sep">|</span>
          <span class="meta-item">
            {profile.screenW}x{profile.screenH}
          </span>
        </div>
      )}
      <button
        class="btn-new-identity"
        onClick={onNewIdentity}
        title="Generate a new fingerprint identity"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 1 1 .908-.418A6 6 0 1 1 8 2v1z" />
          <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966a.25.25 0 0 1 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z" />
        </svg>
        New Identity
      </button>
    </div>
  );
};
