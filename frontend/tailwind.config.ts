import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0066CC',
          dark: '#003366',
          light: '#E6F2FF',
        },
        accent: {
          gold: '#FFB800',
          green: '#00C853',
          red: '#E53935',
          orange: '#FF6B35',
        },
        text: {
          primary: '#1A1A1A',
          secondary: '#666666',
          tertiary: '#999999',
        },
        background: {
          white: '#FFFFFF',
          light: '#F5F7FA',
          gray: '#E8ECF1',
        },
        border: {
          DEFAULT: '#DDDDDD',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Roboto', 'system-ui', 'sans-serif'],
        heading: ['Poppins', 'Montserrat', 'sans-serif'],
      },
      boxShadow: {
        small: '0 2px 4px rgba(0, 0, 0, 0.08)',
        medium: '0 4px 12px rgba(0, 0, 0, 0.1)',
        large: '0 8px 24px rgba(0, 0, 0, 0.12)',
        xlarge: '0 16px 48px rgba(0, 0, 0, 0.15)',
      },
      borderRadius: {
        small: '4px',
        medium: '8px',
        large: '12px',
        xlarge: '16px',
      },
    },
  },
  plugins: [],
}
export default config

