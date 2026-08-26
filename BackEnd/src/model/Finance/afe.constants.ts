export const AFE_TYPES = [
  "GENERAL",
  "CAPEX",
  "OPEX",
  "WIP",
  "REHABILITATION",
  "IT_PROJECT",
  "MAINTENANCE",
  "DRILLING"
] as const;

export const AFE_STATUSES = [
  "ACTIVE",
  "ON_HOLD",
  "CLOSED",
  "CANCELLED"
] as const;

export const AFE_PROJECT_NATURES = [
  "CAPEX",
  "OPEX",
  "MIXED",
  "WIP"
] as const;

export const AFE_PRIORITIES = [
  "LOW",
  "MEDIUM",
  "HIGH",
  "CRITICAL"
] as const;

export type AfeType = (typeof AFE_TYPES)[number];
export type AfeStatus = (typeof AFE_STATUSES)[number];
export type AfeProjectNature = (typeof AFE_PROJECT_NATURES)[number];
export type AfePriority = (typeof AFE_PRIORITIES)[number];
