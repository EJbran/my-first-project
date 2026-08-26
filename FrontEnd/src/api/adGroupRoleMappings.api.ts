import { httpClient } from "./httpClient";

export const adGroupRoleMappingsApi = {
  list: async (params?: Record<string, unknown>) =>
    httpClient.get("/ad-group-role-mappings", { params }),
  getById: async (id: string) => httpClient.get(`/ad-group-role-mappings/${id}`),
  create: async (payload: unknown) => httpClient.post("/ad-group-role-mappings", payload),
  update: async (id: string, payload: unknown) => httpClient.put(`/ad-group-role-mappings/${id}`, payload),
  setStatus: async (id: string, isActive: boolean) =>
    httpClient.patch(`/ad-group-role-mappings/${id}/status`, { isActive }),
  remove: async (id: string) => httpClient.delete(`/ad-group-role-mappings/${id}`)
};
