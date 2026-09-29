import { httpClient } from "./httpClient";

export interface AssetAuditLog {
  Id: number;
  ActorUserId: number | null;
  ActorUserName: string | null;
  Action: string;
  EntityName: string;
  EntityId: string;
  OldData: unknown;
  NewData: unknown;
  CreatedAt: string;
}

export interface AssetAuditLogsResponse {
  success: boolean;
  data: AssetAuditLog[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}

export const auditLogsApi = {
  list: async (params?: Record<string, string | number | undefined>) => {
    const response = await httpClient.get<AssetAuditLogsResponse>("/audit-logs", { params });
    return response.data;
  },
  getById: async (id: string) => httpClient.get(`/audit-logs/${id}`),
  listByEntity: async (entityName: string, entityId: string) =>
    httpClient.get(`/audit-logs/entity/${entityName}/${entityId}`),
  listByUser: async (userId: string) => httpClient.get(`/audit-logs/user/${userId}`)
};
