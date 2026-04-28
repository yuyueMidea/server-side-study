export default {
  content: ["./index.html", "./src/**/*.{vue,js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: {
          50:  "#f8f7f4",
          100: "#efede8",
          200: "#dcd8cf",
          300: "#c4beb2",
          400: "#a99f90",
          500: "#8f8373",
          600: "#76695a",
          700: "#5e5347",
          800: "#4a4139",
          900: "#2c2520",
          950: "#1a1612",
        },
        accent: {
          400: "#f97b3d",
          500: "#f55f1a",
          600: "#d94e0e",
        },
        online:  "#4ade80",
        away:    "#facc15",
        offline: "#6b7280",
      },
      fontFamily: {
        sans:    ["'DM Sans'", "system-ui", "sans-serif"],
        mono:    ["'JetBrains Mono'", "monospace"],
        display: ["'Syne'", "sans-serif"],
      },
      boxShadow: {
        "inner-lg": "inset 0 2px 12px 0 rgb(0 0 0 / 0.18)",
        "glow": "0 0 20px rgb(249 123 61 / 0.35)",
      },
    },
  },
  plugins: [],
};
