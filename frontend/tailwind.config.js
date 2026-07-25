/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        tw: {
          talc: '#FFFFFF',
          mist: '#EDF1F3',
          onyx: '#000000',
          pink: '#F2617A',
          wave: '#003D4F',
          waveDark: '#002834',
          yellow: '#CC850A',
          jade: '#6B9E78',
          sapphire: '#47A1AD',
          purple: '#634F7D',
        },
      },
      fontFamily: {
        serif: ['Bitter', 'serif'],
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
