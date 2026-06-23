import { h } from "preact";

export function Header() {
  return (
    <header class="header">
      <div class="header-logo">
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path
            d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"
            opacity="0.2"
          />
          <path d="M12 6v6l4 2" />
          <circle cx="12" cy="12" r="9" stroke-dasharray="4 2" />
        </svg>
        <h1 class="header-title">Maskware</h1>
      </div>
      <span class="header-version">v2.0</span>
    </header>
  );
}
