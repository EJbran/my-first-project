import type { ApiErrorResponse, ApiPaginatedResponse, ApiSuccessResponse } from "./common.types";

export type { ApiErrorResponse } from "./common.types";
export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;
export type ApiListResponse<T> = ApiPaginatedResponse<T> | ApiErrorResponse;

export interface QueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  [key: string]: string | number | boolean | undefined;
}
