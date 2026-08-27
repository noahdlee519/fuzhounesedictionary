import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "var(--paper)",
        surface: "var(--surface)",
        ink: "var(--ink)",
        inkSoft: "var(--ink-soft)",
        inkFaint: "var(--ink-faint)",
        rule: "var(--rule)",
        ruleStrong: "var(--rule-strong)",
        accent: "var(--lacquer)",
        accentSoft: "var(--lacquer-soft)",
        lacquer: "var(--lacquer)",
      },
      fontFamily: {
        display: ["var(--font-display)", "Arial Narrow", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "Georgia", "Songti SC", "serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
