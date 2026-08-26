import type { ID } from "./common.types";

export type AuthDomainType = "OIDC" | "ADFS" | "LDAP" | "LDAPS" | "KERBEROS";

export interface AuthDomain {
  id: ID;
  name: string;
  type: AuthDomainType;
  tenantId?: string;
  clientId?: string;
  authorityUrl?: string;
  ldapServer?: string;
  ldapPort?: number;
  baseDn?: string;
  isActive: boolean;
}

export interface AdGroupRoleMapping {
  id: ID;
  authDomainId: ID;
  entraGroupObjectId?: string;
  adGroupSid?: string;
  adGroupName?: string;
  roleId: ID;
  isActive: boolean;
}
