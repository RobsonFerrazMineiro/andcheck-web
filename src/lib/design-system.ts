export const fontSize = {
  micro: "text-[9px]",
  caption: "text-[10px]",
  bodyXs: "text-[11px]",
  bodySm: "text-[12px]",
  pageTitle: "text-[18px]",
  kpiValue: "text-[24px]",
  operationalValue: "text-[28px]",
} as const;

export const fontWeight = {
  medium: "font-medium",
  semibold: "font-semibold",
  bold: "font-bold",
} as const;

export const letterSpacing = {
  normal: "tracking-normal",
  wide: "tracking-wide",
  wider: "tracking-wider",
  widest: "tracking-widest",
} as const;

export const textTransform = {
  none: "normal-case",
  uppercase: "uppercase",
  capitalize: "capitalize",
} as const;

export const typography = {
  pageEyebrow: `${fontSize.micro} ${fontWeight.bold} ${textTransform.uppercase} ${letterSpacing.widest}`,
  pageTitle: `${fontSize.pageTitle} ${fontWeight.bold} ${textTransform.uppercase} ${letterSpacing.normal}`,
  sectionLabel: `${fontSize.micro} ${fontWeight.bold} ${textTransform.uppercase} ${letterSpacing.widest}`,
  sectionDescription: `${fontSize.bodyXs}`,
  panelTitle: `${fontSize.caption} ${fontWeight.bold} ${textTransform.uppercase} ${letterSpacing.widest}`,
  panelSubtitle: `${fontSize.micro} ${textTransform.uppercase} ${letterSpacing.wider}`,
  tableHeader: `${fontSize.micro} ${fontWeight.bold} ${textTransform.uppercase} ${letterSpacing.widest}`,
  bodyMuted: `${fontSize.caption}`,
  bodyStrong: `${fontSize.bodyXs} ${fontWeight.semibold}`,
  metaStrong: `${fontSize.micro} ${fontWeight.semibold} ${textTransform.uppercase} ${letterSpacing.wider}`,
  emptyState: `${fontSize.bodyXs} ${fontWeight.semibold} ${textTransform.uppercase} ${letterSpacing.wide}`,
  rankingIndex: `font-mono ${fontSize.caption} ${fontWeight.bold} ${letterSpacing.normal}`,
  kpiValue: `${fontSize.kpiValue} ${fontWeight.bold} ${letterSpacing.normal}`,
  operationalValue: `${fontSize.operationalValue} ${fontWeight.bold} ${letterSpacing.normal}`,
  code: `font-mono ${fontSize.bodyXs} ${fontWeight.bold} ${letterSpacing.normal}`,
  codeMuted: `font-mono ${fontSize.caption} ${letterSpacing.normal}`,
  badge: `font-mono ${fontSize.micro} ${fontWeight.bold} ${textTransform.uppercase} ${letterSpacing.widest}`,
  badgeLg: `font-mono ${fontSize.caption} ${fontWeight.bold} ${textTransform.uppercase} ${letterSpacing.widest}`,
  badgeXl: `font-mono text-[13px] ${fontWeight.bold} ${textTransform.uppercase} ${letterSpacing.widest}`,
  action: `${fontSize.caption} ${fontWeight.bold} ${textTransform.uppercase} ${letterSpacing.widest}`,
  linkAction: `${fontSize.micro} ${fontWeight.bold} ${textTransform.uppercase} ${letterSpacing.widest}`,
} as const;

export const surface = {
  panelHeader: "bg-slate-800 px-4 py-3 text-slate-100",
  panelHeaderIcon: "w-3.5 h-3.5 text-slate-300",
  panelHeaderTitle: `${typography.panelTitle} text-slate-50`,
  panelHeaderSubtitle: `${typography.panelSubtitle} text-slate-400`,
  tableHeader: `bg-slate-800 px-4 py-3 text-slate-100 ${typography.tableHeader}`,
} as const;
