import type { Config } from "tailwindcss";
import colors from "tailwindcss/colors";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    container: { center: true, padding: { DEFAULT: "1rem", sm: "1.5rem", lg: "2rem" }, screens: { "2xl": "1200px" } },
    extend: {
      colors: {
        // Street-plaque world: cobalt enamel plates on a lime-washed wall.
        // "sea" is the enamel scale (700 = the plate colour), "sand" the plaster neutrals,
        // "clay" the accent role, kept on the same enamel so actions and signs read as one material.
        sea: { 50: "#eef2fb", 100: "#dbe3f5", 200: "#b7c6ea", 500: "#3456a8", 600: "#26479a", 700: "#1f3c88", 800: "#182f6b", 900: "#111f47" },
        // 400 is the form-control border: 3.35:1 on white (WCAG 1.4.11).
        sand: { 50: "#f4f4f1", 100: "#ebebe6", 200: "#dfe0d9", 300: "#c8cac1", 400: "#8a8e82" },
        clay: { 400: "#9db0e0", 500: "#3456a8", 600: "#1f3c88", 700: "#182f6b" },
        // ink-soft is below 4.5:1: decorative marks and disabled states only, never text to be read.
        ink: { DEFAULT: "#17213a", muted: "#4f5a70", soft: "#8a93a3" },
        // Status roles. Use these instead of raw palette hues so meanings stay consistent.
        success: colors.green,
        danger: colors.red,
        warning: colors.amber,
        info: colors.sky,
        neutral: colors.gray,
        external: colors.violet, // things that come from outside the booking flow: iCal sync, refunds
      },
      fontFamily: {
        // Sofia Sans: a Bulgarian-designed family with native Bulgarian Cyrillic forms.
        sans: ["Sofia Sans", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "Arial", "sans-serif"],
        display: ["Sofia Sans Condensed", "Arial Narrow", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(17,31,71,.06), 0 8px 24px -12px rgba(17,31,71,.2)",
        plate: "0 1px 1px rgba(17,31,71,.12), 0 6px 14px -8px rgba(17,31,71,.45)",
      },
      keyframes: {
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "rise-in": { from: { opacity: "0", transform: "translateY(12px)" }, to: { opacity: "1", transform: "none" } },
      },
      animation: {
        "fade-in": "fade-in .4s ease-out both",
        "rise-in": "rise-in .6s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
