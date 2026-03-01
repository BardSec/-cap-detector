/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#f0f4ff',
          100: '#dce6ff',
          500: '#3b6bfa',
          600: '#2952d9',
          700: '#1e3eb5',
          900: '#0f2060',
        },
      },
    },
  },
  plugins: [],
}
