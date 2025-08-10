/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Material Design 3 Color System
        'md-primary': 'var(--md-sys-color-primary)',
        'md-on-primary': 'var(--md-sys-color-on-primary)',
        'md-primary-container': 'var(--md-sys-color-primary-container)',
        'md-on-primary-container': 'var(--md-sys-color-on-primary-container)',
        'md-secondary': 'var(--md-sys-color-secondary)',
        'md-on-secondary': 'var(--md-sys-color-on-secondary)',
        'md-secondary-container': 'var(--md-sys-color-secondary-container)',
        'md-on-secondary-container': 'var(--md-sys-color-on-secondary-container)',
        'md-surface': 'var(--md-sys-color-surface)',
        'md-on-surface': 'var(--md-sys-color-on-surface)',
        'md-surface-variant': 'var(--md-sys-color-surface-variant)',
        'md-on-surface-variant': 'var(--md-sys-color-on-surface-variant)',
        'md-background': 'var(--md-sys-color-background)',
        'md-on-background': 'var(--md-sys-color-on-background)',
        'md-error': 'var(--md-sys-color-error)',
        'md-on-error': 'var(--md-sys-color-on-error)',
        'md-error-container': 'var(--md-sys-color-error-container)',
        'md-on-error-container': 'var(--md-sys-color-on-error-container)',

        // Legacy colors for backward compatibility
        primary: '#1976D2',
        secondary: '#DC004E',
        accent: '#3a95ff',
        danger: '#BA1A1A',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
      fontSize: {
        // Apple HIG Typography Scale
        'ios-large-title': ['34px', { lineHeight: '41px', fontWeight: '700' }],
        'ios-title-1': ['28px', { lineHeight: '34px', fontWeight: '700' }],
        'ios-title-2': ['22px', { lineHeight: '28px', fontWeight: '700' }],
        'ios-title-3': ['20px', { lineHeight: '25px', fontWeight: '600' }],
        'ios-headline': ['17px', { lineHeight: '22px', fontWeight: '600' }],
        'ios-body': ['17px', { lineHeight: '22px', fontWeight: '400' }],
        'ios-callout': ['16px', { lineHeight: '21px', fontWeight: '400' }],
        'ios-subhead': ['15px', { lineHeight: '20px', fontWeight: '400' }],
        'ios-footnote': ['13px', { lineHeight: '18px', fontWeight: '400' }],
        'ios-caption-1': ['12px', { lineHeight: '16px', fontWeight: '400' }],
        'ios-caption-2': ['11px', { lineHeight: '13px', fontWeight: '400' }],

        // Material Design Typography Scale
        'md-display-large': ['57px', { lineHeight: '64px', fontWeight: '400' }],
        'md-display-medium': ['45px', { lineHeight: '52px', fontWeight: '400' }],
        'md-display-small': ['36px', { lineHeight: '44px', fontWeight: '400' }],
        'md-headline-large': ['32px', { lineHeight: '40px', fontWeight: '400' }],
        'md-headline-medium': ['28px', { lineHeight: '36px', fontWeight: '400' }],
        'md-headline-small': ['24px', { lineHeight: '32px', fontWeight: '400' }],
        'md-title-large': ['22px', { lineHeight: '28px', fontWeight: '400' }],
        'md-title-medium': ['16px', { lineHeight: '24px', fontWeight: '500' }],
        'md-title-small': ['14px', { lineHeight: '20px', fontWeight: '500' }],
        'md-body-large': ['16px', { lineHeight: '24px', fontWeight: '400' }],
        'md-body-medium': ['14px', { lineHeight: '20px', fontWeight: '400' }],
        'md-body-small': ['12px', { lineHeight: '16px', fontWeight: '400' }],
        'md-label-large': ['14px', { lineHeight: '20px', fontWeight: '500' }],
        'md-label-medium': ['12px', { lineHeight: '16px', fontWeight: '500' }],
        'md-label-small': ['11px', { lineHeight: '16px', fontWeight: '500' }],
      },
      spacing: {
        // Design System Spacing (8pt grid)
        'xs': 'var(--spacing-xs)', // 4px
        'sm': 'var(--spacing-sm)', // 8px
        'md': 'var(--spacing-md)', // 16px
        'lg': 'var(--spacing-lg)', // 24px
        'xl': 'var(--spacing-xl)', // 32px
        '2xl': 'var(--spacing-2xl)', // 48px
        '3xl': 'var(--spacing-3xl)', // 64px

        // Legacy spacing
        '18': '4.5rem',
        '88': '22rem',

        // Touch targets
        'touch-ios': 'var(--min-touch-target)', // 44px
        'touch-md': 'var(--md-min-touch-target)', // 48px
      },
      borderRadius: {
        'xs': 'var(--radius-xs)', // 4px
        'sm': 'var(--radius-sm)', // 8px
        'md': 'var(--radius-md)', // 12px
        'lg': 'var(--radius-lg)', // 16px
        'xl': 'var(--radius-xl)', // 24px
        'full': 'var(--radius-full)', // 9999px

        // Legacy values
        '2xl': '1.5rem',
      },
      boxShadow: {
        // Material Design Elevation System
        'elevation-0': 'var(--elevation-0)',
        'elevation-1': 'var(--elevation-1)',
        'elevation-2': 'var(--elevation-2)',
        'elevation-3': 'var(--elevation-3)',
        'elevation-4': 'var(--elevation-4)',
        'elevation-5': 'var(--elevation-5)',

        // Legacy shadows
        'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
        'medium': '0 4px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        'large': '0 10px 40px -10px rgba(0, 0, 0, 0.15), 0 20px 25px -5px rgba(0, 0, 0, 0.1)',
      },
      transitionDuration: {
        'short': 'var(--duration-short)', // 100ms
        'medium': 'var(--duration-medium)', // 200ms
        'long': 'var(--duration-long)', // 300ms
        'extra-long': 'var(--duration-extra-long)', // 500ms
      },
      transitionTimingFunction: {
        'standard': 'var(--easing-standard)',
        'decelerate': 'var(--easing-decelerate)',
        'accelerate': 'var(--easing-accelerate)',
      },
      animation: {
        'fade-in': 'fadeIn var(--duration-extra-long) var(--easing-standard)',
        'slide-up': 'slideUp var(--duration-long) var(--easing-decelerate)',
        'bounce-gentle': 'bounceGentle 2s infinite var(--easing-standard)',
        'scale-in': 'scaleIn var(--duration-medium) var(--easing-decelerate)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        bounceGentle: {
          '0%, 100%': { transform: 'translateY(-5%)' },
          '50%': { transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
  // 为失败而设计：确保在配置错误时有降级机制
  safelist: [
    'bg-primary',
    'text-primary',
    'border-primary',
    'hover:bg-primary-600',
    'focus:ring-primary-500',
  ],
}
