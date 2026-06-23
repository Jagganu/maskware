import { h, FunctionalComponent } from "preact";
import type { HardwareProfile } from "../../shared/types";

interface Props {
  profile: HardwareProfile | null;
}

export const Footer: FunctionalComponent<Props> = ({ profile }) => {
  return (
    <footer class="footer">
      {profile && (
        <div class="footer-gpu">
          {profile.gpuVendor} | {profile.timezone} | {profile.city},{" "}
          {profile.country}
        </div>
      )}
      <div class="footer-links">
        <a
          href="https://github.com/maskware/maskware"
          target="_blank"
          rel="noopener"
        >
          GitHub
        </a>
        <a href="https://maskware.io" target="_blank" rel="noopener">
          Website
        </a>
      </div>
    </footer>
  );
};
