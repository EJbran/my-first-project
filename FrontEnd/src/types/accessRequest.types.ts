import type { ID } from "./common.types";

export type AccessRequestStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";

export interface AccessRequest {
  id: ID;
  userId: ID;
  roleId?: ID;
  permissionId?: ID;
  reason?: string;
  status: AccessRequestStatus;
  createdAt: string;
}

export interface Delegation {
  id: ID;
  fromUserId: ID;
  toUserId: ID;
  startAt: string;
  endAt: string;
  status: "PENDING" | "APPROVED" | "REVOKED";
}
