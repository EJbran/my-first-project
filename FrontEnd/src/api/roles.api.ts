import { httpClient } from "./httpClient";
import type { QueryParams } from "../types/api.types";

export const rolesApi = {
  list: async (params?: QueryParams) => httpClient.get("/roles", { params }),
  getById: async (id: string) => httpClient.get(`/roles/${id}`),
  create: async (payload: unknown) => httpClient.post("/roles", payload),
  update: async (id: string, payload: unknown) => httpClient.put(`/roles/${id}`, payload),
  setStatus: async (id: string, isActive: boolean) => httpClient.patch(`/roles/${id}/status`, { isActive }),
  remove: async (id: string) => httpClient.delete(`/roles/${id}`),
  getPermissions: async (id: string) => httpClient.get(`/roles/${id}/permissions`),
  addPermissions: async (id: string, permissionIds: string[]) =>
    httpClient.post(`/roles/${id}/permissions`, { permissionIds }),
  removePermission: async (id: string, permissionId: string) =>
    httpClient.delete(`/roles/${id}/permissions/${permissionId}`)
};
