/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.njk", "./src/**/*.html", "./src/**/*.md"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#6B8E23",
          50: "#f1f6e6",
          100: "#e4edd0",
          200: "#c9dca2",
          300: "#aecb75",
          400: "#94ba48",
          500: "#7aa11f",
          600: "#6b8e23",
          700: "#556f1c",
          800: "#425616",
          900: "#2d3a0f",
        },
      },
      fontFamily: {
        sans: [
          "Inter var",
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Ubuntu",
          "Cantarell",
          "Noto Sans",
          "Helvetica Neue",
          "Arial",
          "Apple Color Emoji",
          "Segoe UI Emoji",
        ],
      },
    },
  },
  plugins: [require("@tailwindcss/forms"), require("@tailwindcss/typography")],
};
