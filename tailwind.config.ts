import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: {
        "2xl": "1240px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        /* BasketWise design system palette */
        leaf: {
          50: "var(--bw-leaf-50)",
          100: "var(--bw-leaf-100)",
          200: "var(--bw-leaf-200)",
          300: "var(--bw-leaf-300)",
          400: "var(--bw-leaf-400)",
          500: "var(--bw-leaf-500)",
          600: "var(--bw-leaf-600)",
          700: "var(--bw-leaf-700)",
          800: "var(--bw-leaf-800)",
          900: "var(--bw-leaf-900)",
        },
        cream: {
          50: "var(--bw-cream-50)",
          100: "var(--bw-cream-100)",
          200: "var(--bw-cream-200)",
          300: "var(--bw-cream-300)",
        },
        ink: {
          300: "var(--bw-ink-300)",
          500: "var(--bw-ink-500)",
          700: "var(--bw-ink-700)",
          800: "var(--bw-ink-800)",
          900: "var(--bw-ink-900)",
        },
        tomato: {
          100: "var(--bw-tomato-100)",
          500: "var(--bw-tomato-500)",
        },
        amber: {
          100: "var(--bw-amber-100)",
          500: "var(--bw-amber-500)",
        },
        "store-woolies": "var(--store-woolies)",
        "store-coles": "var(--store-coles)",
        "store-aldi-blue": "var(--store-aldi-blue)",
        "store-iga": "var(--store-iga)",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 4px)",
        sm: "calc(var(--radius) - 8px)",
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-body)", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SF Mono", "Menlo", "monospace"],
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
