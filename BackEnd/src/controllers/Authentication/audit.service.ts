import { AuditLog, LoginAttempt } from "../../model/Authentication";
import type { UserAuthProvider } from "../../model/types/auth.enums";

export interface RequestInfo {
  ipAddress?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
}

export const recordAudit = async (params: {
  actorUserId?: number | null;
  action: string;
  module?: string | null;
  entityName?: string | null;
  entityId?: string | null;
  status?: "SUCCESS" | "FAILED";
  oldData?: unknown;
  newData?: unknown;
  requestInfo?: RequestInfo;
  transaction?: import("sequelize").Transaction;
}): Promise<void> => {
  await AuditLog.create(
    {
      ActorUserId: params.actorUserId ?? null,
      Action: params.action,
      Module: params.module ?? null,
      EntityName: params.entityName ?? null,
      EntityId: params.entityId ?? null,
      Status: params.status ?? "SUCCESS",
      OldData: params.oldData ? JSON.stringify(params.oldData) : null,
      NewData: params.newData ? JSON.stringify(params.newData) : null,
      RequestId: params.requestInfo?.requestId ?? null,
      IpAddress: params.requestInfo?.ipAddress ?? null,
      UserAgent: params.requestInfo?.userAgent ?? null
    },
    params.transaction ? { transaction: params.transaction } : undefined
  );
};

export const recordLoginAttempt = async (params: {
  userId?: number | null;
  username?: string | null;
  email?: string | null;
  authProvider?: UserAuthProvider | null;
  isSuccessful: boolean;
  failureReason?: string | null;
  requestInfo?: RequestInfo;
  transaction?: import("sequelize").Transaction;
}): Promise<void> => {
  await LoginAttempt.create(
    {
      UserId: params.userId ?? null,
      Username: params.username ?? null,
      Email: params.email ?? null,
      AuthProvider: params.authProvider ?? null,
      IsSuccessful: params.isSuccessful,
      FailureReason: params.failureReason ?? null,
      IpAddress: params.requestInfo?.ipAddress ?? null,
      UserAgent: params.requestInfo?.userAgent ?? null
    },
    params.transaction ? { transaction: params.transaction } : undefined
  );
};
