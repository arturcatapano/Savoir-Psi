/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'savoir-navy': '#1B263B',   // Azul Marinho
        'savoir-gold': '#C5A880',   // Dourado/Bege
        'savoir-light': '#F4F1EA',  // Fundo Creme
        'savoir-text': '#2D3436',   // Cinza Escuro
      },
      fontFamily: {
        serif: ['Playfair Display', 'serif'],
        sans: ['Lato', 'sans-serif'],
      }
    },
  },
  plugins: [],
}