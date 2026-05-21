/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"], // Gunakan format v3
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Tambahkan ini agar warna oranye dan cyan kamu menyala
        cyan: { 400: "#22d3ee", 500: "#06b6d4" },
        orange: { 500: "#f97316", 600: "#ea580c" },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}