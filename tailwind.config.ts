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
        // One Latin face for everything (Charis SIL) and a serif for Chinese
        // characters. `display` and `serif` are the same face; both names are
        // kept so every page resolves. There is no mono face any more —
        // labels are small caps and romanization is the text face upright;
        // `mono` is left pointing at the system for anything genuinely code.
        // Charter is the fallback because Charis is drawn from it.
        display: ["var(--font-display)", "Charter", "Bitstream Charter", "Iowan Old Style", "Georgia", "serif"],
        serif: ["var(--font-display)", "Charter", "Bitstream Charter", "Iowan Old Style", "Georgia", "serif"],
        han: ["var(--font-rare)", "var(--font-han)", "Songti TC", "Source Han Serif TC", "Noto Serif CJK TC", "PingFang TC", "serif"],
        ui: ["var(--font-ui)", "Helvetica Neue", "Arial", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SF Mono", "Menlo", "monospace"],
      },
      boxShadow: { soft: "var(--shadow)" },
      maxWidth: { wrap: "1040px" },
    },
  },
  plugins: [],
};

export default config;
