/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#080C14",
        surface: "#0F172A",
        card: "rgba(15, 23, 42, 0.75)",
        border: "rgba(255, 255, 255, 0.08)",
        primary: {
          DEFAULT: "#06B6D4", // Cyber Cyan
          hover: "#0891B2",
          light: "rgba(6, 182, 212, 0.15)",
        },
        accent: {
          emerald: "#10B981",
          amber: "#F59E0B",
          violet: "#8B5CF6",
          rose: "#F43F5E",
        },
      },
      fontFamily: {
        sans: ["Outfit", "Inter", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [],
};
