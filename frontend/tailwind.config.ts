import type { Config } from 'tailwindcss'

export default {
  content: [
    './app.vue',
    './app/**/*.{vue,ts,js}',
    './app/pages/**/*.vue',
    './app/components/**/*.vue',
    './app/layouts/**/*.vue',
    './pages/**/*.vue',
    './components/**/*.vue',
    './layouts/**/*.vue',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#f97316',
        secondary: '#22c55e',
      },
    },
  },
  plugins: [],
} satisfies Config
