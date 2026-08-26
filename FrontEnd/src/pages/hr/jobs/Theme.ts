import type { Theme } from "@mui/material/styles";

export const getHrThemeVars = (_theme: Theme) => ({
  "--hr-text": "light-dark(#071c59, #e8eefc)",
  "--hr-row-text": "light-dark(#17233a, #e2e8f0)",
  "--hr-accent": "light-dark(#0b35d9, #8fb3ff)",
  "--hr-accent-hover": "light-dark(#0a286f, #b8ccff)",
  "--hr-primary-button": "light-dark(#0b1f3a, #8fb3ff)",
  "--hr-primary-button-hover": "light-dark(#071329, #b8ccff)",
  "--hr-on-accent": "light-dark(#ffffff, #08111f)",
  "--hr-muted": "light-dark(#60708e, #a6b3ca)",
  "--hr-strong-muted": "light-dark(#394a6b, #c3cee0)",
  "--hr-border": "light-dark(#dce4f1, #2b3950)",
  "--hr-divider-soft": "light-dark(#edf1f7, #243147)",
  "--hr-surface": "light-dark(#ffffff, #111827)",
  "--hr-surface-soft": "light-dark(#f5f7fb, #172033)",
  "--hr-surface-hover": "light-dark(#f8faff, #1b2940)",
  "--hr-selected": "light-dark(#eef4ff, #1d3153)",
  "--hr-accent-border": "light-dark(#abc2ff, #476aa8)",
  "--hr-canvas-dot": "light-dark(#dce4f0, #324158)",
  "--hr-connector": "light-dark(#5d83d7, #7fa2ef)",
  "--hr-success-text": "light-dark(#139640, #86efac)",
  "--hr-success-bg": "light-dark(#e9f8ee, rgba(34, 197, 94, 0.15))",
  "--hr-success-track": "light-dark(#d9efdf, #263b32)",
  "--hr-shadow": "0 8px 24px light-dark(rgba(25, 54, 103, 0.07), rgba(0, 0, 0, 0.28))"
} as Record<string, string>);
