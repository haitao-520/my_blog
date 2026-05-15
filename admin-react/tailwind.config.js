/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: { extend: {} },
  plugins: [],
  safelist: [
    'bg-blue-100', 'text-blue-600',
    'bg-emerald-100', 'text-emerald-600',
    'bg-purple-100', 'text-purple-600',
    'bg-orange-100', 'text-orange-600',
    'bg-pink-100', 'text-pink-600',
  ],
};