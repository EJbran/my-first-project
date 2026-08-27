import type { ApiErrorResponse, ApiListResponse, ApiResponse } from "./api.types";

export interface AssetCategory {
  CategoryID: number;
  CategoryName: string;
  Percentage: string | number;
  DepAccountID: number;
  CreditAccountID: number;
  Description: string;
}

export interface AssetCategoryPayload {
  CategoryName: string;
  Percentage: number;
  DepAccountID: number;
  CreditAccountID: number;
  Description: string;
}

export type AssetCategoryResponse<T> = ApiResponse<T>;
export type AssetCategoryListResponse = ApiListResponse<AssetCategory>;
export type AssetCategoryApiError = ApiErrorResponse;
