/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'folha-dark': '#4A5A43',   // Azul Marinho
        'folha-accent': '#B77A4A',   // Dourado/Bege
        'folha-light': '#F5F2EC',  // Fundo Creme
        'folha-text': '#4A5A43',   // Cinza Escuro
      },
      fontFamily: {
        serif: ['Playfair Display', 'serif'],
        sans: ['Lato', 'sans-serif'],
      }
    },
  },
  plugins: [],
}