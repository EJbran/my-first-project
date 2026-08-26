import { httpClient } from "./httpClient";

export const permissionGroupsApi = {
  list: async (params?: Record<string, unknown>) => httpClient.get("/permission-groups", { params }),
  getById: async (id: string) => httpClient.get(`/permission-groups/${id}`),
  create: async (payload: unknown) => httpClient.post("/permission-groups", payload),
  update: async (id: string, payload: unknown) => httpClient.put(`/permission-groups/${id}`, payload),
  remove: async (id: string) => httpClient.delete(`/permission-groups/${id}`),
  listPermissions: async (id: string) => httpClient.get(`/permission-groups/${id}/permissions`)
};
