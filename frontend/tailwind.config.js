/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      fontFamily: {
        // Dalal Street Light typography stack
        heading: ['"Chivo"', 'system-ui', 'sans-serif'],
        body: ['"DM Sans"', 'system-ui', 'sans-serif'],
        devanagari: ['"IBM Plex Sans Devanagari"', 'system-ui', 'sans-serif'],
        numbers: ['"Chivo"', '"DM Sans"', 'tabular-nums', 'monospace'],
      },
      transitionTimingFunction: {
        // Bazaar Snap spring physics — bouncy / responsive
        'snap': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'snap-soft': 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      boxShadow: {
        // Layered brassware depth for Bazaar Bismuth tiles
        'tile': '0 1px 3px rgba(13,27,42,0.04), 0 0 0 1px rgba(13,27,42,0.04)',
        'tile-hover': '0 8px 24px rgba(13,27,42,0.08), 0 0 0 1px rgba(200,134,10,0.16)',
        'tile-best': '0 6px 20px rgba(200,134,10,0.12), 0 0 0 1px rgba(200,134,10,0.32)',
        'amber-glow': '0 0 0 4px rgba(255,179,71,0.12)',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)'
      },
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))'
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))'
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))'
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))'
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))'
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))'
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))'
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))'
        },
        // Dalal Street Light palette
        cream: '#FFFBF5',
        ink: '#0A1118',           // deeper than original navy
        amber: {
          DEFAULT: '#C8860A',
          neon: '#FFB347',        // Dalal Street Midnight neon amber
          glow: 'rgba(255,179,71,0.18)',
        },
        slate: {
          ink: '#334155',
        },
        emerald: {
          trust: '#10B981',
        },
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' }
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' }
        },
        // Bazaar Snap entrance + shimmer
        'snap-in': {
          '0%': { opacity: 0, transform: 'translateY(12px) scale(0.96)' },
          '70%': { opacity: 1, transform: 'translateY(-2px) scale(1.01)' },
          '100%': { opacity: 1, transform: 'translateY(0) scale(1)' },
        },
        'amber-shimmer': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(255,179,71,0.4)' },
          '50%': { boxShadow: '0 0 0 6px rgba(255,179,71,0.0)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'snap-in': 'snap-in 420ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        'amber-shimmer': 'amber-shimmer 3s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 2.4s ease-in-out infinite',
      }
    }
  },
  plugins: [require("tailwindcss-animate")],
};
