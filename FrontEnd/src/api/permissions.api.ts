import { httpClient } from "./httpClient";
import type { QueryParams } from "../types/api.types";

export const permissionsApi = {
  list: async (params?: QueryParams) => httpClient.get("/permissions", { params }),
  getById: async (id: string) => httpClient.get(`/permissions/${id}`),
  create: async (payload: unknown) => httpClient.post("/permissions", payload),
  update: async (id: string, payload: unknown) => httpClient.put(`/permissions/${id}`, payload),
  setStatus: async (id: string, isActive: boolean) =>
    httpClient.patch(`/permissions/${id}/status`, { isActive }),
  remove: async (id: string) => httpClient.delete(`/permissions/${id}`)
};
