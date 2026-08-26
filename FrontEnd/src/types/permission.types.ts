import type { ID } from "./common.types";

export interface Permission {
  id: ID;
  code: string;
  module: string;
  actionName: string;
  description?: string;
  isActive: boolean;
}
