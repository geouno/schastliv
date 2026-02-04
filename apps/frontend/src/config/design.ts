/**
 * Design configuration constants
 * Centralized values for layout dimensions, spacing, and tokens
 */

// Layout dimensions (in pixels for calculation, can be converted to rem/rem)
export const HEADER_HEIGHT = 72; // 4.5rem (1.5rem padding top + bottom, ~1rem content height)
export const HEADER_HEIGHT_REM = HEADER_HEIGHT / 16;

// Spacing tokens (in rem)
export const SPACING = {
  xs: 0.5,
  sm: 1,
  md: 1.5,
  lg: 2,
  xl: 3,
  xxl: 4,
  xxxl: 6,
} as const;

// Full viewport height calculation for landing sections
export const getLandingSectionHeight = (margin: number = SPACING.md) => {
  return `calc(100vh - ${HEADER_HEIGHT}px - ${margin}rem)`;
};

// Individual section heights (when not in a landing container)
export const getHeroHeight = (margin: number = SPACING.md) => {
  return `calc(100vh - ${HEADER_HEIGHT}px - ${margin}rem)`;
};

export const getFooterHeight = (margin: number = 0) => {
  return `calc(100vh - ${HEADER_HEIGHT}px - ${margin}rem)`;
};

// Typography scale (vw units for fluid type)
export const FLUID_TYPE = {
  heroTitle: "clamp(3rem, 5vw, 6rem)", // Main display text
  heroSubtitle: "clamp(2rem, 3.5vw, 4.5rem)", // Secondary display text
  display: "4rem", // Standard display text
  displaySmall: "2rem", // Smaller display text
} as const;

// CSS custom properties to inject
export const designTokens = {
  "--header-height": `${HEADER_HEIGHT}px`,
  "--header-height-rem": `${HEADER_HEIGHT_REM}rem`,
} as const;
