import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    container: { center: true, padding: { DEFAULT: "1.25rem", sm: "1.5rem", lg: "2.5rem" }, screens: { "2xl": "1280px" } },
    extend: {
      // Sharper palette: near-black ink, warm paper, a deep pine "sea" and one burnt-orange accent.
      colors: {
        sea: { 50: "#eef3f2", 100: "#d3e1df", 200: "#a7c3bf", 500: "#2b6a64", 600: "#1f5852", 700: "#174641", 800: "#113632", 900: "#0b2422" },
        sand: { 50: "#f7f5f0", 100: "#efebe3", 200: "#e2dccf", 300: "#cfc6b3" },
        clay: { 400: "#e08a5f", 500: "#c25a2a", 600: "#a5461a", 700: "#873813" },
        ink: { DEFAULT: "#14181a", muted: "#4d5559", soft: "#5f676b" },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "Arial", "sans-serif"],
        serif: ["var(--font-display)", "Iowan Old Style", "Palatino Linotype", "Georgia", "serif"],
      },
      // Crisp geometry: every rounded-* in the app collapses to a small, consistent radius.
      borderRadius: { sm: "2px", DEFAULT: "3px", md: "3px", lg: "4px", xl: "4px", "2xl": "4px", "3xl": "6px" },
      boxShadow: {
        card: "0 1px 0 rgba(11,36,34,.04)",
        lift: "0 24px 48px -24px rgba(11,36,34,.35)",
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
