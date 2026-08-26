import type { ID } from "./common.types";

export interface Role {
  id: ID;
  code: string;
  name: string;
  description?: string;
  isActive: boolean;
}

export interface PermissionGroup {
  id: ID;
  code: string;
  name: string;
  description?: string;
}
