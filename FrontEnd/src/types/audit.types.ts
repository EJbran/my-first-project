import type { ID } from "./common.types";

export interface AuditLog {
  id: ID;
  actorUserId?: ID;
  module: string;
  action: string;
  entityName: string;
  entityId?: string;
  status: "SUCCESS" | "FAILED";
  oldData?: Record<string, unknown>;
  newData?: Record<string, unknown>;
  createdAt: string;
}
