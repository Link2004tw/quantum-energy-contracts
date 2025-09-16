export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#1e40af', // Static color
        secondary: {
          light: '#60a5fa',
          DEFAULT: '#3b82f6',
          dark: '#1e40af',
        },
        // Dynamic color variables
        'custom-blue': 'var(--custom-blue, #3b82f6)',
        'custom-accent': 'var(--custom-accent, #10b981)',
      },
    },
  },
  plugins: [],
};