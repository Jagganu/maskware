import { h, FunctionalComponent } from "preact";
import { SHIELD_META } from "../../shared/constants";
import type { ShieldConfig } from "../../shared/types";

interface Props {
  config: ShieldConfig;
  onToggle: (id: string) => void;
}

export const ShieldList: FunctionalComponent<Props> = ({
  config,
  onToggle,
}) => {
  return (
    <div class="shield-list">
      <h2 class="section-title">Shields</h2>
      {Object.entries(SHIELD_META).map(([id, meta]) => (
        <div class="shield-row" key={id}>
          <div class="shield-info">
            <span class="shield-name">{meta.name}</span>
            <span class="shield-desc">{meta.desc}</span>
          </div>
          <label class="toggle">
            <input
              type="checkbox"
              checked={!!config[id]}
              onChange={() => onToggle(id)}
            />
            <span class="toggle-track" />
          </label>
        </div>
      ))}
    </div>
  );
};
