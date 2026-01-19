/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx}", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Construction Bold color scheme
        navy: {
          50: '#e6e6eb',
          100: '#b3b3c2',
          200: '#808099',
          300: '#4d4d70',
          400: '#333357',
          500: '#1a1a2e', // Primary navy
          600: '#171729',
          700: '#121220',
          800: '#0d0d17',
          900: '#08080e',
        },
        gold: {
          50: '#fef5e6',
          100: '#fce6bf',
          200: '#fad699',
          300: '#f8c773',
          400: '#f6b84d',
          500: '#f5a623', // Primary gold
          600: '#dd951f',
          700: '#ac751a',
          800: '#7b5415',
          900: '#4a330d',
        },
        // Semantic colors
        primary: '#1a1a2e',
        secondary: '#f5a623',
        success: '#10b981',
        warning: '#f59e0b',
        danger: '#ef4444',
        info: '#3b82f6',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
        heading: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 2px 8px rgba(26, 26, 46, 0.08)',
        'card-hover': '0 4px 16px rgba(26, 26, 46, 0.12)',
        'dropdown': '0 4px 12px rgba(26, 26, 46, 0.15)',
      },
    },
  },
  plugins: [],
};
