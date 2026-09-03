export const fonts = {
  family: {
    regular: "System",
    medium: "System",
    semibold: "System",
    bold: "System",
    heavy: "System",
  },
  weight: {
    regular: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
    heavy: "900",
  },
  size: {
    xs: 11,
    sm: 12,
    md: 14,
    lg: 16,
    xl: 19,
    xxl: 25,
    display: 34,
  },
} as const;

// Typography is centralized here so the new brand can switch to bundled Arabic
// fonts (for example Cairo/Tajawal) without touching every screen.
