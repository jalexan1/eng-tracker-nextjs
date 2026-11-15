import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // ── Fondo principal ──────────────────────────────
        canvas:   '#0A0F1E',
        surface:  '#111827',
        elevated: '#1F2937',
        border:   '#374151',
        // ── Accent primario (violeta) ────────────────────
        primary: {
          DEFAULT: '#7C3AED',
          light:   '#8B5CF6',
          dark:    '#6D28D9',
        },
        // ── App English (violeta-índigo) ─────────────────
        english: {
          DEFAULT: '#6366F1',
          light:   '#818CF8',
          dark:    '#4F46E5',
        },
        // ── App Spanish (naranja-ámbar) ──────────────────
        spanish: {
          DEFAULT: '#F59E0B',
          light:   '#FCD34D',
          dark:    '#D97706',
        },
        // ── Estados ─────────────────────────────────────
        success: '#10B981',
        warning: '#F59E0B',
        error:   '#EF4444',
        info:    '#3B82F6',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn:  { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { transform: 'translateY(10px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
      },
    },
  },
  plugins: [],
}

export default config
