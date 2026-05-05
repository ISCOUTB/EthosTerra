/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        panel: { DEFAULT: '#1e293b', hover: '#334155' },
        accent: { DEFAULT: '#22c55e', hover: '#16a34a' },
        card: { DEFAULT: '#0f172a', border: '#334155' },
      },
    },
  },
  plugins: [],
};
