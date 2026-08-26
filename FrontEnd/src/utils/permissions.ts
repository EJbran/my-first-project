export const hasPermission = (permissions: string[], code: string): boolean =>
  permissions.includes(code);

export const hasAnyPermission = (permissions: string[], codes: string[]): boolean =>
  codes.some((code) => permissions.includes(code));

export const hasAllPermissions = (permissions: string[], codes: string[]): boolean =>
  codes.every((code) => permissions.includes(code));
