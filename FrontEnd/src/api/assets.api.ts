import { httpClient } from "./httpClient";
import type { Asset, AssetListResponse, AssetPayload, AssetResponse } from "../types/asset.types";

export const assetsApi = {
  list: async (params?: { search?: string }): Promise<AssetListResponse> => {
    const response = await httpClient.get<AssetListResponse>("/assets", { params });
    return response.data;
  },
  getById: async (id: string | number): Promise<AssetResponse<Asset>> => {
    const response = await httpClient.get<AssetResponse<Asset>>(`/assets/${id}`);
    return response.data;
  },
  create: async (payload: AssetPayload) =>
    httpClient.post<AssetResponse<Asset>>("/assets", payload),
  update: async (id: string | number, payload: AssetPayload) =>
    httpClient.put<AssetResponse<Asset>>(`/assets/${id}`, payload),
  remove: async (id: string | number) =>
    httpClient.delete<AssetResponse<Asset>>(`/assets/${id}`)
};
