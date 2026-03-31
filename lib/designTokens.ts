export const designTokens = {
  colors: {
    pageBg: "bg-[#120f0d]",
    pageText: "text-[#f4efe9]",

    surface: "bg-[#191614]",
    surfaceSoft: "bg-[#211d1a]",
    surfaceMuted: "bg-[#28231f]",

    border: "border-[#3a312b]",
    borderSoft: "border-[#2d2621]",

    textPrimary: "text-[#f4efe9]",
    textSecondary: "text-[#d8cbbf]",
    textMuted: "text-[#a9998c]",

    accentPrimary: "bg-[#7fa7c6]",
    accentPrimarySoft: "bg-[#7fa7c6]/15",
    accentPrimaryText: "text-[#deebf5]",
    accentPrimaryBorder: "border-[#7fa7c6]/30",

    accentSecondary: "bg-[#d8c6a8]",
    accentSecondarySoft: "bg-[#d8c6a8]/15",
    accentSecondaryText: "text-[#f2e7d6]",
    accentSecondaryBorder: "border-[#d8c6a8]/30",

    accentRose: "bg-[#c99898]",
    accentRoseSoft: "bg-[#c99898]/15",
    accentRoseText: "text-[#f5dede]",
    accentRoseBorder: "border-[#c99898]/30",

    accentGold: "bg-[#d8c27a]",
    accentGoldSoft: "bg-[#d8c27a]/15",
    accentGoldText: "text-[#f4ebc7]",
    accentGoldBorder: "border-[#d8c27a]/30",

    accentGreen: "bg-[#8fbf9f]",
    accentGreenSoft: "bg-[#8fbf9f]/15",
    accentGreenText: "text-[#def1e3]",
    accentGreenBorder: "border-[#8fbf9f]/30",
  },

  radius: {
    card: "rounded-3xl",
    inner: "rounded-2xl",
    pill: "rounded-full",
  },

  shadow: {
    card: "shadow-[0_12px_32px_rgba(0,0,0,0.24)]",
    soft: "shadow-[0_8px_24px_rgba(0,0,0,0.18)]",
  },

  card:
    "rounded-3xl border border-[#3a312b] bg-[#191614] shadow-[0_12px_32px_rgba(0,0,0,0.24)]",

  cardSoft:
    "rounded-3xl border border-[#2d2621] bg-[#211d1a] shadow-[0_8px_24px_rgba(0,0,0,0.18)]",

  innerPanel: "rounded-2xl border border-[#2d2621] bg-[#211d1a]",

  buttonPrimary:
    "rounded-full border border-[#7fa7c6]/30 bg-[#7fa7c6]/15 px-5 py-3 text-sm font-medium text-[#deebf5] transition hover:bg-[#7fa7c6]/24 focus:outline-none focus:ring-2 focus:ring-[#7fa7c6]/35 focus:ring-offset-2 focus:ring-offset-[#120f0d]",

  buttonSecondary:
    "rounded-full border border-[#3a312b] bg-[#211d1a] px-5 py-3 text-sm font-medium text-[#f4efe9] transition hover:bg-[#2a2420] focus:outline-none focus:ring-2 focus:ring-[#7fa7c6]/25 focus:ring-offset-2 focus:ring-offset-[#120f0d]",

  buttonSuccess:
    "rounded-full border border-[#8fbf9f]/30 bg-[#8fbf9f]/15 px-5 py-3 text-sm font-medium text-[#def1e3] transition hover:bg-[#8fbf9f]/24 focus:outline-none focus:ring-2 focus:ring-[#8fbf9f]/35 focus:ring-offset-2 focus:ring-offset-[#120f0d]",

  input:
    "w-full rounded-2xl border border-[#3a312b] bg-[#211d1a] px-4 py-3 text-sm text-[#f4efe9] outline-none placeholder:text-[#8f7f72] transition focus:border-[#7fa7c6]/45 focus:ring-2 focus:ring-[#7fa7c6]/20",

  textarea:
    "min-h-[140px] w-full rounded-2xl border border-[#3a312b] bg-[#211d1a] px-4 py-3 text-sm text-[#f4efe9] outline-none placeholder:text-[#8f7f72] transition focus:border-[#7fa7c6]/45 focus:ring-2 focus:ring-[#7fa7c6]/20",

  badgeBlue:
    "inline-flex rounded-full border border-[#7fa7c6]/30 bg-[#7fa7c6]/15 px-3 py-1 text-sm font-medium text-[#deebf5]",

  badgeGreen:
    "inline-flex rounded-full border border-[#8fbf9f]/30 bg-[#8fbf9f]/15 px-3 py-1 text-sm font-medium text-[#def1e3]",

  badgeGold:
    "inline-flex rounded-full border border-[#d8c27a]/30 bg-[#d8c27a]/15 px-3 py-1 text-sm font-medium text-[#f4ebc7]",

  badgeRose:
    "inline-flex rounded-full border border-[#c99898]/30 bg-[#c99898]/15 px-3 py-1 text-sm font-medium text-[#f5dede]",
} as const;