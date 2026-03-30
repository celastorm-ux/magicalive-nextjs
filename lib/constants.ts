/**
 * Magicalive design tokens — mirrors app/globals.css variables.
 */

export const COLORS = {
  bg: "#000000",
  gold: "#f5cc71",
  goldHover: "#f2c24f",
  goldSoft: "rgba(245, 204, 113, 0.1)",
  goldBorder: "rgba(245, 204, 113, 0.25)",
  goldBorderSubtle: "rgba(245, 204, 113, 0.2)",
  goldDot: "rgba(245, 204, 113, 0.8)",
  goldGlowStrong: "rgba(245, 204, 113, 0.18)",
  goldGlowMid: "rgba(245, 204, 113, 0.14)",
  goldGlowSoft: "rgba(245, 204, 113, 0.1)",
  goldGlowCard: "rgba(245, 204, 113, 0.16)",
  goldCtaGlow: "rgba(245, 204, 113, 0.26)",
  text: "#f4f4f5",
  textBright: "#fafafa",
  textSecondary: "#d4d4d8",
  textMuted: "#a1a1aa",
  textFaint: "#71717a",
  textDim: "#52525b",
  border: "rgba(255, 255, 255, 0.1)",
  borderStrong: "rgba(255, 255, 255, 0.15)",
  borderHover: "rgba(255, 255, 255, 0.25)",
  border20: "rgba(255, 255, 255, 0.2)",
  surface3: "rgba(255, 255, 255, 0.03)",
  surface5: "rgba(255, 255, 255, 0.05)",
  surface7: "rgba(255, 255, 255, 0.075)",
  surface10: "rgba(255, 255, 255, 0.1)",
  surfaceCard: "rgba(0, 0, 0, 0.2)",
  surfaceCta: "rgba(0, 0, 0, 0.2)",
  backdropNav: "rgba(0, 0, 0, 0.7)",
  emeraldText: "#a7f3d0",
  emeraldDot: "#6ee7b7",
  emeraldBorder: "rgba(52, 211, 153, 0.2)",
  emeraldBg: "rgba(52, 211, 153, 0.1)",
} as const;

export const FONTS = {
  /** Display / headings (loaded via next/font → --font-cormorant) */
  headingName: "Cormorant Garamond",
  heading: "var(--font-cormorant), ui-serif, Georgia, serif",
  /** Body / UI */
  bodyName: "Geist Sans",
  body: "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif",
  monoName: "Geist Mono",
  mono: "var(--font-geist-mono), ui-monospace, monospace",
} as const;

/** Tailwind class strings — pair headings with `ml-font-heading` where needed */
export const CLASSES = {
  section: "mx-auto max-w-6xl px-4 sm:px-6",

  headingHero:
    "ml-font-heading text-4xl font-semibold leading-tight tracking-tight text-zinc-50 sm:text-6xl",
  headingSection:
    "ml-font-heading text-2xl font-semibold text-zinc-50 sm:text-3xl",
  headingCard: "ml-font-heading text-lg font-semibold text-zinc-50",
  headingSub: "ml-font-heading text-xl font-semibold text-zinc-50",
  headingLogo: "ml-font-heading text-xl font-semibold tracking-wide",

  bodyLead: "text-base leading-7 text-zinc-300 sm:text-lg",
  bodyMuted: "text-sm text-zinc-300",
  labelCaps:
    "text-xs font-medium uppercase tracking-wide text-zinc-400",

  btnPrimary:
    "inline-flex cursor-pointer items-center justify-center rounded-2xl bg-[var(--ml-gold)] px-5 py-3 text-sm font-semibold text-black transition hover:bg-[var(--ml-gold-hover)]",
  btnPrimarySm:
    "inline-flex cursor-pointer items-center justify-center rounded-xl bg-[var(--ml-gold)] px-3 py-2 text-xs font-semibold text-black transition hover:bg-[var(--ml-gold-hover)]",
  btnSecondary:
    "inline-flex cursor-pointer items-center justify-center rounded-2xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-zinc-200 transition hover:border-white/25 hover:bg-white/10",
  btnSecondarySm:
    "cursor-pointer rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-zinc-200 transition hover:border-white/20 hover:bg-white/10",
  btnGhostGold:
    "inline-flex cursor-pointer items-center justify-center rounded-2xl border border-[var(--ml-gold)]/40 bg-transparent px-4 py-2.5 text-sm font-semibold text-[var(--ml-gold)] transition hover:border-[var(--ml-gold)]/60 hover:bg-[var(--ml-gold)]/10",
  btnOutlineLight:
    "inline-flex cursor-pointer items-center justify-center rounded-2xl border border-white/20 bg-[var(--ml-surface-cta)] px-5 py-3 text-sm font-semibold text-zinc-50 transition hover:bg-black/30",
  btnSignIn:
    "cursor-pointer rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:border-white/25 hover:bg-white/10",
  btnCreateProfile:
    "inline-flex cursor-pointer items-center justify-center rounded-full bg-[var(--ml-gold)] px-4 py-2 text-sm font-semibold text-black transition hover:bg-[var(--ml-gold-hover)]",

  card: "rounded-2xl border border-white/10 bg-white/[0.03]",
  cardLg: "rounded-3xl border border-white/10 bg-white/[0.03]",
  cardInteractive:
    "rounded-3xl border border-white/10 bg-white/[0.03] transition hover:border-[var(--ml-gold)]/30 hover:bg-white/[0.05]",
  cardGlass:
    "relative overflow-hidden rounded-3xl border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-6",
  cardRow:
    "flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3",
  cardCta:
    "flex items-center justify-between rounded-2xl border border-[var(--ml-gold-border)] bg-[var(--ml-gold-soft)] px-4 py-3",

  navLink:
    "text-sm text-zinc-300 transition-colors hover:text-[var(--ml-gold)]",
  navLinkActive: "text-sm font-medium text-[var(--ml-gold)]",
  navMobileLink:
    "block border-b border-white/10 py-4 text-base text-zinc-200 transition hover:text-[var(--ml-gold)]",
  navMobileLinkActive:
    "block border-b border-white/10 py-4 text-base font-medium text-[var(--ml-gold)]",

  pillGold:
    "inline-flex items-center gap-2 rounded-full border border-[var(--ml-gold-border-subtle)] bg-[var(--ml-gold-soft)] px-3 py-1 text-xs font-medium tracking-wide text-[var(--ml-gold)]",
  badgeDirectory:
    "ml-2 inline-flex items-center rounded-full border border-[var(--ml-gold-border)] bg-[var(--ml-gold-soft)] px-2 py-0.5 text-xs font-medium text-[var(--ml-gold)]",
  tag: "rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-medium text-zinc-200",
  badgeOnline:
    "inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200",
  badgeAvailable:
    "inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-zinc-300",

  inputSearch:
    "w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-10 pr-4 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none ring-0 transition focus:border-[var(--ml-gold)]/50 focus:bg-white/10",

  input:
    "rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none transition focus:border-[var(--ml-gold)]/50 focus:bg-white/10",

  textarea:
    "rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none transition focus:border-[var(--ml-gold)]/50 focus:bg-white/10",

  linkGold: "text-sm font-semibold text-[var(--ml-gold)] hover:text-[var(--ml-gold-hover)]",

  tableShell: "overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03]",
  tableRow: "transition hover:bg-white/[0.04]",

  footerBar:
    "flex flex-col gap-3 text-xs text-zinc-500 sm:flex-row sm:items-center sm:justify-between",
  footerLink: "hover:text-zinc-300",

  headerSticky:
    "sticky top-0 z-50 border-b border-white/10 bg-black/70 backdrop-blur",
} as const;
