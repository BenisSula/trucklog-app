/**
 * Theme Configuration
 * Centralized styling constants following DRY principle
 */

export const BRAND_COLORS = {
  primary: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
  },
  accent: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
  },
  neutral: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
  },
  success: {
    50: '#ecfdf5',
    100: '#d1fae5',
    200: '#a7f3d0',
    300: '#6ee7b7',
    400: '#34d399',
    500: '#10b981',
    600: '#059669',
    700: '#047857',
    800: '#065f46',
    900: '#064e3b',
  },
  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
  },
} as const;

// Icon styling classes following DRY principle
export const ICON_STYLES = {
  // Section header icons with brand background
  sectionHeader: 'p-2 bg-primary-100 rounded-lg',
  sectionHeaderIcon: 'h-5 w-5 text-primary-600',
  
  // Form field icons
  formField: 'h-5 w-5 text-neutral-400',
  
  // Status icons
  success: 'h-5 w-5 text-success-600',
  error: 'h-5 w-5 text-error-600',
  warning: 'h-5 w-5 text-accent-600',
  info: 'h-5 w-5 text-primary-600',
  
  // Stats card icons
  statsCard: 'h-5 w-5',
  statsCardContainer: 'p-2 rounded-lg',
} as const;

// Button styling following DRY principle
export const BUTTON_STYLES = {
  primary: 'text-white bg-primary-600 hover:bg-primary-700 focus:ring-primary-500',
  secondary: 'text-neutral-700 bg-neutral-100 hover:bg-neutral-200 focus:ring-neutral-500',
  danger: 'text-white bg-error-600 hover:bg-error-700 focus:ring-error-500',
  success: 'text-white bg-success-600 hover:bg-success-700 focus:ring-success-500',
} as const;

// Card styling following DRY principle
export const CARD_STYLES = {
  base: 'bg-white rounded-lg shadow-sm border border-neutral-200',
  padding: 'p-4 sm:p-6',
  header: 'flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6',
  title: 'text-lg font-semibold text-neutral-900',
} as const;

// Status badge styling following DRY principle
export const STATUS_BADGE_STYLES = {
  valid: 'bg-success-100 text-success-800',
  warning: 'bg-accent-100 text-accent-800',
  error: 'bg-error-100 text-error-800',
  info: 'bg-primary-100 text-primary-800',
} as const;

// Form styling following DRY principle
export const FORM_STYLES = {
  grid: 'grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6',
  input: 'w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-primary-500 focus:border-primary-500',
  label: 'block text-sm font-medium text-neutral-700 mb-2',
  error: 'text-sm text-error-600 mt-1',
  helpText: 'text-xs text-neutral-500 mt-1',
} as const;

// Export commonly used brand colors for easy access
export const PRIMARY_BLUE = BRAND_COLORS.primary[600];
export const PRIMARY_BLUE_LIGHT = BRAND_COLORS.primary[100];
export const PRIMARY_BLUE_DARK = BRAND_COLORS.primary[700];