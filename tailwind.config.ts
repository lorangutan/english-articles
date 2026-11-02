import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Values live in globals.css as CSS variables so dark mode can swap them.
        ivory: "rgb(var(--ivory) / <alpha-value>)",
        paper: "rgb(var(--paper) / <alpha-value>)",
        ink: {
          DEFAULT: "rgb(var(--ink) / <alpha-value>)",
          soft: "rgb(var(--ink-soft) / <alpha-value>)",
          faint: "rgb(var(--ink-faint) / <alpha-value>)",
        },
        rule: "rgb(var(--rule) / <alpha-value>)",
        gold: {
          DEFAULT: "rgb(var(--gold) / <alpha-value>)",
          deep: "rgb(var(--gold-deep) / <alpha-value>)",
          wash: "rgb(var(--gold-wash) / <alpha-value>)",
        },
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      letterSpacing: { eyebrow: "0.22em" },
      maxWidth: { measure: "38rem" },
    },
  },
  plugins: [],
} satisfies Config;
