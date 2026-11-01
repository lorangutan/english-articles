import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ivory: "#F5F0E6",
        paper: "#FAF7F0",
        ink: { DEFAULT: "#23211E", soft: "#5A564F", faint: "#8A857B" },
        rule: "#DCD3C2",
        gold: { DEFAULT: "#B49B6C", deep: "#7D6844", wash: "#ECE3D0" },
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
