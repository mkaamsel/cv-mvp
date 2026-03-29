export const designTokens = {
  colors: {
    background: "#F1F6FF",
    backgroundSoft: "#E3EEFF",
    surface: "#FFFFFF",
    surfaceAlt: "#E4F5ED",

    primary: "#9EC5FF",
    primaryHover: "#86B6FB",
    primarySoft: "#E3EEFF",

    accentGreen: "#E4F5ED",
    accentYellow: "#FFF7D9",
    accentPurple: "#ECE4FF",

    textPrimary: "#1F2937",
    textSecondary: "#475569",
    textMuted: "#64748B",
    textOnPrimary: "#10243E",

    border: "#D8E4F2",
    borderSoft: "#E8EFF7",

    success: "#BDE7D0",
    warning: "#F7E7A8",
    danger: "#F3C7C7",

    focusRing: "#9EC5FF",
  },

  radius: {
    sm: "10px",
    md: "14px",
    lg: "20px",
    xl: "28px",
  },

  shadow: {
    sm: "0 1px 2px rgba(15, 23, 42, 0.04)",
    md: "0 6px 18px rgba(15, 23, 42, 0.06)",
    lg: "0 12px 30px rgba(15, 23, 42, 0.08)",
  },

  spacing: {
    section: "clamp(3rem, 6vw, 5rem)",
    container: "1200px",
  },
} as const;