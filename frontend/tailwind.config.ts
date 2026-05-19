import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#000000",
        foreground: "#FAFAFA",
        muted: "#A0A0A0",
        border: "#2C2C2E",
        surface: "#111111",
        surfaceHighlight: "#1C1C1E",
        primary: {
          DEFAULT: "#FFFFFF",
          foreground: "#000000",
        },
        secondary: {
          DEFAULT: "#1C1C1E",
          foreground: "#FFFFFF",
        },
        destructive: {
          DEFAULT: "#ef4444",
          foreground: "#FFFFFF",
        },
        ring: "#FFFFFF",
      },
      fontFamily: {
        serif: ["Playfair Display", "Georgia", "serif"],
        sans: ["DM Sans", "Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 24px 70px rgba(0, 0, 0, 0.8)",
      },
    },
  },
  plugins: [],
};

export default config;
