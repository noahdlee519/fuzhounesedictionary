import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  // <html data-theme> is set before first paint (layout.tsx) to the stored
  // choice or the system preference, so dark: classes follow the switch too.
  darkMode: ["selector", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        paper: "var(--paper)",
        surface: "var(--surface)",
        surface2: "var(--surface2)",
        ink: "var(--ink)",
        inkSoft: "var(--ink-soft)",
        inkFaint: "var(--ink-faint)",
        inkMute: "var(--ink-mute)",
        rule: "var(--rule)",
        ruleStrong: "var(--rule-strong)",
        accent: "var(--lacquer)",
        accentSoft: "var(--lacquer-soft)",
        lacquer: "var(--lacquer)",
        lacquerInk: "var(--lacquer-ink)",
        green: "var(--green)",
        amber: "var(--amber)",
      },
      fontFamily: {
        // One Latin face for everything (Inter Tight), a serif for Chinese
        // characters, a mono for romanization and small labels. `serif` is
        // kept as a name so older pages resolve; it is the sans now.
        display: ["var(--font-display)", "SF Pro Display", "Helvetica Neue", "Helvetica", "Arial", "system-ui", "sans-serif"],
        serif: ["var(--font-display)", "SF Pro Display", "Helvetica Neue", "Helvetica", "Arial", "system-ui", "sans-serif"],
        han: ["var(--font-han)", "Songti TC", "Source Han Serif TC", "Noto Serif CJK TC", "PingFang TC", "serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SF Mono", "Menlo", "monospace"],
      },
      boxShadow: { soft: "var(--shadow)" },
      maxWidth: { wrap: "1040px" },
    },
  },
  plugins: [],
};

export default config;
