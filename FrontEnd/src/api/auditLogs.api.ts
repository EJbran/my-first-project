import { httpClient } from "./httpClient";

export const auditLogsApi = {
  list: async (params?: Record<string, unknown>) => httpClient.get("/audit-logs", { params }),
  getById: async (id: string) => httpClient.get(`/audit-logs/${id}`),
  listByEntity: async (entityName: string, entityId: string) =>
    httpClient.get(`/audit-logs/entity/${entityName}/${entityId}`),
  listByUser: async (userId: string) => httpClient.get(`/audit-logs/user/${userId}`)
};
