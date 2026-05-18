import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ivory: "#FDFAF6",
        stone: "#C4B9A8",
        charcoal: "#1C1917",
        blush: "#E8C5B0",
        muted: "#6B6560",
        border: "#DED6CA",
        background: "#FDFAF6",
        foreground: "#1C1917",
        primary: {
          DEFAULT: "#1C1917",
          foreground: "#FDFAF6",
        },
        secondary: {
          DEFAULT: "#E8C5B0",
          foreground: "#1C1917",
        },
        destructive: {
          DEFAULT: "#8F3B2F",
          foreground: "#FDFAF6",
        },
        ring: "#1C1917",
      },
      fontFamily: {
        serif: ["Playfair Display", "Georgia", "serif"],
        sans: ["DM Sans", "Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 24px 70px rgba(28, 25, 23, 0.14)",
      },
    },
  },
  plugins: [],
};

export default config;
