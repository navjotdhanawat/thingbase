/**
 * ThingBase Brand Configuration
 * 
 * Color Palette: Uber-inspired - Bold Black & White with Blue accents
 * - Primary: Pure Black (#000000) - Main brand color, text, headers
 * - Secondary: Safety Blue (#276EF1) - CTAs, buttons, important actions
 * - Success: Uber Green (#47B275) - Success states, online status
 * 
 * This file is the single source of truth for brand colors.
 * Update these values to customize the platform branding.
 */

// =============================================================================
// BRAND IDENTITY
// =============================================================================

export const BRAND = {
    name: 'ThingBase',
    tagline: 'IoT Platform for Developers',
    description: 'Open-source IoT platform for device management, real-time telemetry, and multi-tenant control.',
    website: 'https://thingbase.io',
    support: 'support@thingbase.io',
    copyright: `© ${new Date().getFullYear()} ThingBase. All rights reserved.`,
} as const;

// =============================================================================
// BRAND COLORS - Uber-inspired Black & White with Blue accents
// =============================================================================

export const BRAND_COLORS = {
    // Primary color - Pure Black (main brand, text, headers)
    primary: {
        50: '#fafafa',
        100: '#f5f5f5',
        200: '#e5e5e5',
        300: '#d4d4d4',
        400: '#a3a3a3',
        500: '#737373',
        600: '#525252',
        700: '#404040',
        800: '#262626',
        900: '#171717',
        950: '#000000',  // Main primary - Pure Black
        DEFAULT: '#000000',
    },

    // Secondary color - Safety Blue (CTAs, buttons, important actions)
    secondary: {
        50: '#eff6ff',
        100: '#dbeafe',
        200: '#bfdbfe',
        300: '#93c5fd',
        400: '#60a5fa',
        500: '#3b82f6',
        600: '#276ef1',  // Main secondary - Uber Safety Blue
        700: '#1d4ed8',
        800: '#1e40af',
        900: '#1e3a8a',
        950: '#172554',
        DEFAULT: '#276ef1',
    },

    // Accent colors from Uber palette
    accent: {
        green: '#47b275',   // Uber Green - success
        yellow: '#ffc043',  // Uber Yellow - warning
        red: '#f25138',     // Uber Red - error/destructive
        orange: '#ff7d49',  // Uber Orange
        purple: '#7356bf',  // Uber Purple
        brown: '#99644c',   // Uber Brown
    },

    // Semantic colors (Uber palette)
    success: '#47b275',  // Uber Green
    warning: '#ffc043',  // Uber Yellow
    error: '#f25138',    // Uber Red
    info: '#276ef1',     // Safety Blue

    // Neutral colors for text and backgrounds
    neutral: {
        50: '#fafafa',
        100: '#f5f5f5',
        200: '#eeeeee',
        300: '#e0e0e0',
        400: '#bdbdbd',
        500: '#9e9e9e',
        600: '#757575',
        700: '#616161',
        800: '#424242',
        900: '#212121',
        950: '#121212',
    },

    // Pure black & white
    black: '#000000',
    white: '#ffffff',
} as const;

// =============================================================================
// CSS CUSTOM PROPERTIES (for web)
// =============================================================================

export const CSS_VARIABLES = {
    light: {
        '--brand-primary': BRAND_COLORS.primary.DEFAULT,     // Pure black
        '--brand-primary-foreground': '#ffffff',
        '--brand-secondary': BRAND_COLORS.secondary.DEFAULT, // Safety blue
        '--brand-secondary-foreground': '#ffffff',
        '--brand-accent': BRAND_COLORS.accent.green,         // Uber green
        '--brand-accent-foreground': '#ffffff',
    },
    dark: {
        '--brand-primary': '#ffffff',                        // White for dark mode
        '--brand-primary-foreground': '#000000',
        '--brand-secondary': '#60a5fa',                      // Lighter blue
        '--brand-secondary-foreground': '#000000',
        '--brand-accent': '#6ee7b7',                         // Lighter green
        '--brand-accent-foreground': '#000000',
    },
} as const;

// =============================================================================
// HEX TO RGB UTILITY
// =============================================================================

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
        ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16),
        }
        : null;
}

// =============================================================================
// FLUTTER COLOR FORMAT (0xAARRGGBB)
// =============================================================================

export const FLUTTER_COLORS = {
    // Primary - Pure Black
    primary: '0xFF000000',
    primaryLight: '0xFF262626',
    primaryDark: '0xFF000000',

    // Secondary - Safety Blue
    secondary: '0xFF276EF1',
    secondaryLight: '0xFF60A5FA',
    secondaryDark: '0xFF1D4ED8',

    // Accent - Uber Green
    accent: '0xFF47B275',
    accentLight: '0xFF6EE7B7',
    accentDark: '0xFF059669',

    // Semantic (Uber palette)
    success: '0xFF47B275',
    warning: '0xFFFFC043',
    error: '0xFFF25138',
    info: '0xFF276EF1',

    // Neutrals
    white: '0xFFFFFFFF',
    black: '0xFF000000',
    background: '0xFFFFFFFF',
    surface: '0xFFFFFFFF',
    onSurface: '0xFF000000',
} as const;

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type BrandColorShade = keyof typeof BRAND_COLORS.primary;
export type BrandColor = keyof typeof BRAND_COLORS;
