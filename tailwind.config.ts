import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        void: "#050811",
        surface: "rgba(10, 20, 35, 0.85)",
        "surface-dark": "rgba(5, 8, 17, 0.95)",
        "holo-border": "rgba(56, 189, 248, 0.22)",
        "holo-cyan": "#38bdf8",
        "holo-amber": "#f59e0b",
        "holo-bright": "#e0f2fe",
        "holo-muted": "#94a3b8",
        "holo-lie": "#cbd5e1",
        "holo-red": "#f43f5e",
        "holo-green": "#10b981"
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'monospace'],
        display: ['Cinzel', 'serif']
      },
      boxShadow: {
        'holo-cyan': '0 0 24px rgba(56, 189, 248, 0.25)',
        'holo-amber': '0 0 24px rgba(245, 158, 11, 0.25)',
        'panel': '0 16px 48px rgba(0, 0, 0, 0.8), inset 0 0 20px rgba(56, 189, 248, 0.05)'
      }
    },
  },
  plugins: [],
};
export default config;
