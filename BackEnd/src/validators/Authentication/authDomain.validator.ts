import type { AuthDomainMethod } from "../../model/types/auth.enums";

export interface AuthDomainPayload {
  DomainName?: string;
  NetbiosName?: string | null;
  AuthMethod?: AuthDomainMethod;
  AuthorityUrl?: string | null;
  TenantId?: string | null;
  ClientId?: string | null;
  LdapServer?: string | null;
  LdapPort?: number | null;
  BaseDn?: string | null;
  IsActive?: boolean;
}

export const validateAuthDomainPayload = (payload: AuthDomainPayload): string[] => {
  const errors: string[] = [];

  if (!payload.DomainName) {
    errors.push("DomainName is required");
  }

  if (!payload.AuthMethod) {
    errors.push("AuthMethod is required");
    return errors;
  }

  if (payload.AuthMethod === "OIDC") {
    if (!payload.TenantId) {
      errors.push("TenantId is required when AuthMethod is OIDC");
    }
    if (!payload.ClientId) {
      errors.push("ClientId is required when AuthMethod is OIDC");
    }
    if (!payload.AuthorityUrl) {
      errors.push("AuthorityUrl is required when AuthMethod is OIDC");
    }
  }

  if (payload.AuthMethod === "ADFS" && !payload.AuthorityUrl) {
    errors.push("AuthorityUrl is required when AuthMethod is ADFS");
  }

  if (payload.AuthMethod === "LDAP" || payload.AuthMethod === "LDAPS") {
    if (!payload.LdapServer) {
      errors.push("LdapServer is required for LDAP/LDAPS");
    }
    if (!payload.BaseDn) {
      errors.push("BaseDn is required for LDAP/LDAPS");
    }
  }

  return errors;
};

export const normalizeAuthDomainPayload = (
  payload: AuthDomainPayload
): AuthDomainPayload => {
  if (payload.AuthMethod === "LDAP" && !payload.LdapPort) {
    payload.LdapPort = 389;
  }

  if (payload.AuthMethod === "LDAPS" && !payload.LdapPort) {
    payload.LdapPort = 636;
  }

  return payload;
};
