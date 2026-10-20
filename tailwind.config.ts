import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    container: { center: true, padding: { DEFAULT: "1rem", sm: "1.5rem", lg: "2rem" }, screens: { "2xl": "1200px" } },
    extend: {
      colors: {
        sea: { 50: "#eef6f7", 100: "#d5e8ec", 200: "#a9d0d8", 500: "#2f7184", 600: "#235f71", 700: "#1d4e5f", 800: "#173e4b", 900: "#102c35" },
        sand: { 50: "#fbf9f5", 100: "#f6f3ee", 200: "#ece5d8", 300: "#dccfb8" },
        clay: { 400: "#d9896a", 500: "#c9714b", 600: "#b05d39", 700: "#8f4a2c" },
        ink: { DEFAULT: "#1f2a2e", muted: "#5b6b70", soft: "#8a979b" },
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "sans-serif"],
        serif: ["Iowan Old Style", "Palatino Linotype", "Palatino", "Georgia", "Cambria", "Times New Roman", "serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(16,44,53,.06), 0 8px 24px -12px rgba(16,44,53,.18)",
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
