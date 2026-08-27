import { httpClient } from "./httpClient";
import type {
  AssetCategory,
  AssetCategoryListResponse,
  AssetCategoryPayload,
  AssetCategoryResponse
} from "../types/assetCategory.types";

export const assetCategoriesApi = {
  list: async (params?: { search?: string }): Promise<AssetCategoryListResponse> => {
    const response = await httpClient.get<AssetCategoryListResponse>("/asset-categories", { params });
    return response.data;
  },
  getById: async (id: string | number): Promise<AssetCategoryResponse<AssetCategory>> => {
    const response = await httpClient.get<AssetCategoryResponse<AssetCategory>>(`/asset-categories/${id}`);
    return response.data;
  },
  create: async (payload: AssetCategoryPayload) =>
    httpClient.post<AssetCategoryResponse<AssetCategory>>("/asset-categories", payload),
  update: async (id: string | number, payload: AssetCategoryPayload) =>
    httpClient.put<AssetCategoryResponse<AssetCategory>>(`/asset-categories/${id}`, payload),
  remove: async (id: string | number) =>
    httpClient.delete<AssetCategoryResponse<AssetCategory>>(`/asset-categories/${id}`)
};
