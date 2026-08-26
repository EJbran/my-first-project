import { httpClient } from "./httpClient";

export const userDevicesApi = {
  list: async (params?: Record<string, unknown>) => httpClient.get("/user-devices", { params }),
  getById: async (id: string) => httpClient.get(`/user-devices/${id}`),
  listByUser: async (userId: string) => httpClient.get(`/user-devices/user/${userId}`),
  trust: async (id: string) => httpClient.patch(`/user-devices/${id}/trust`),
  untrust: async (id: string) => httpClient.patch(`/user-devices/${id}/untrust`),
  setStatus: async (id: string, isActive: boolean) => httpClient.patch(`/user-devices/${id}/status`, { isActive })
};
