const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface AdGroupRoleMappingPayload {
  AuthDomainId?: number;
  EntraGroupObjectId?: string | null;
  AdGroupSid?: string | null;
  AdGroupName?: string;
  RoleId?: number;
  IsActive?: boolean;
}

export const validateAdGroupRoleMappingPayload = (
  payload: AdGroupRoleMappingPayload
): string[] => {
  const errors: string[] = [];

  if (!payload.AuthDomainId) {
    errors.push("AuthDomainId is required");
  }

  if (!payload.RoleId) {
    errors.push("RoleId is required");
  }

  if (!payload.AdGroupName) {
    errors.push("AdGroupName is required");
  }

  if (!payload.EntraGroupObjectId && !payload.AdGroupSid) {
    errors.push("Either EntraGroupObjectId or AdGroupSid is required");
  }

  if (payload.EntraGroupObjectId && !UUID_REGEX.test(payload.EntraGroupObjectId)) {
    errors.push("EntraGroupObjectId must be a valid UUID");
  }

  return errors;
};
