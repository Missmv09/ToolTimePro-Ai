/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx}", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Task Iguana palette — electric teal + blue on near-black.
        // `navy` kept as a token name for compatibility; now maps to near-black ink.
        navy: {
          50: '#eef0f2',
          100: '#d0d5da',
          200: '#a3acb5',
          300: '#6b7580',
          400: '#3a424b',
          500: '#0A0C11', // Primary near-black (brand ink)
          600: '#080910',
          700: '#06070c',
          800: '#040507',
          900: '#020304',
        },
        // `gold` kept as a token name; now maps to electric teal.
        gold: {
          50: '#e7fcf8',
          100: '#c2f7ee',
          200: '#9df2e4',
          300: '#6fecd6',
          400: '#45e7cd',
          500: '#1FE3C4', // electric teal
          600: '#17b39b',
          700: '#128a78',
          800: '#0d6255',
          900: '#073a33',
        },
        // Electric teal + electric blue (explicit tokens).
        teal: {
          50: '#e7fcf8', 100: '#c2f7ee', 200: '#9df2e4', 300: '#6fecd6', 400: '#45e7cd',
          500: '#1FE3C4', 600: '#17b39b', 700: '#128a78', 800: '#0d6255', 900: '#073a33',
        },
        // Override Tailwind's built-in warm palettes: orange-* (CTAs) -> electric blue,
        // amber-* (highlights) -> electric teal.
        orange: {
          50: '#e9f4ff', 100: '#c6e2ff', 200: '#9ecdff', 300: '#6fb5ff', 400: '#4aa5ff',
          500: '#2E9BFF', 600: '#1e7fe0', 700: '#1763b0', 800: '#104780', 900: '#092b4f',
        },
        amber: {
          50: '#e7fcf8', 100: '#c2f7ee', 200: '#9df2e4', 300: '#6fecd6', 400: '#45e7cd',
          500: '#1FE3C4', 600: '#17b39b', 700: '#128a78', 800: '#0d6255', 900: '#073a33',
        },
        // Semantic colors
        primary: '#0A0C11',   // near-black ink
        secondary: '#1FE3C4', // electric teal
        success: '#17b39b',   // teal (legible on light)
        warning: '#f59e0b',
        danger: '#ef4444',
        info: '#2E9BFF',      // electric blue
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
        heading: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 2px 8px rgba(10, 12, 17, 0.08)',
        'card-hover': '0 4px 16px rgba(10, 12, 17, 0.12)',
        'dropdown': '0 4px 12px rgba(10, 12, 17, 0.15)',
      },
    },
  },
  plugins: [],
};
