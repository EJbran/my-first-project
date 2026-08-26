export const USER_AUTH_PROVIDERS = ["AD", "LDAP", "SSO", "LOCAL"] as const;
export type UserAuthProvider = (typeof USER_AUTH_PROVIDERS)[number];

export const AUTH_DOMAIN_METHODS = [
  "OIDC",
  "ADFS",
  "LDAP",
  "LDAPS",
  "KERBEROS"
] as const;
export type AuthDomainMethod = (typeof AUTH_DOMAIN_METHODS)[number];

export const MFA_FACTOR_TYPES = ["TOTP", "SMS", "EMAIL", "APP"] as const;
export type MfaFactorType = (typeof MFA_FACTOR_TYPES)[number];

export const MFA_MANAGED_BY = ["ERP", "ENTRA", "ADFS"] as const;
export type MfaManagedBy = (typeof MFA_MANAGED_BY)[number];

export const AUDIT_LOG_STATUSES = ["SUCCESS", "FAILED"] as const;
export type AuditLogStatus = (typeof AUDIT_LOG_STATUSES)[number];

export const ACCESS_REQUEST_TYPES = ["ROLE", "PERMISSION"] as const;
export type AccessRequestType = (typeof ACCESS_REQUEST_TYPES)[number];

export const ACCESS_REQUEST_STATUSES = [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "CANCELLED"
] as const;
export type AccessRequestStatus = (typeof ACCESS_REQUEST_STATUSES)[number];

export const ACCESS_REQUEST_APPROVAL_DECISIONS = [
  "PENDING",
  "APPROVED",
  "REJECTED"
] as const;
export type AccessRequestApprovalDecision =
  (typeof ACCESS_REQUEST_APPROVAL_DECISIONS)[number];

export const DELEGATION_TYPES = ["ROLE", "PERMISSION", "WORKFLOW"] as const;
export type DelegationType = (typeof DELEGATION_TYPES)[number];

export const USER_DEVICE_TYPES = ["MOBILE", "WEB", "DESKTOP"] as const;
export type UserDeviceType = (typeof USER_DEVICE_TYPES)[number];
