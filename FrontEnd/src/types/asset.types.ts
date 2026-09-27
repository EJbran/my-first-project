import type { ApiListResponse, ApiResponse } from "./api.types";

export interface AssetCategory {
  CategoryID: number;
  CategoryName: string;
}

export interface Department {
  Id: number;
  DepartmentName_Arabic: string;
  DepartmentName_English: string;
}

export interface SubLocation {
  Id: number;
  Name: string;
  Type: string | null;
  LocationId: number;
}

export interface Asset {
  AssetID: number;
  AssetCode: string;
  AssetDescription: string;
  CategoryID: number;
  SubLocationID: number;
  DepartmentID: number;
  PurchaseDate: string;
  InsertedDate: string;
  PurchaseCost: string | number;
  BookValue: string | number;
  OpeningBalanceBookValue: string | number;
  DepreciationValue: string | number;
  NetValue: string | number;
  ResponsibleID: number;
  ResponsibleNote: string | null;
  Status: string;
  Category?: AssetCategory;
  Department?: Department;
  SubLocation?: SubLocation;
}

export interface AssetPayload {
  AssetCode: string;
  AssetDescription: string;
  CategoryID: number;
  SubLocationID: number;
  DepartmentID: number;
  PurchaseDate: string;
  InsertedDate: string;
  PurchaseCost: number;
  BookValue: number;
  OpeningBalanceBookValue: number;
  DepreciationValue: number;
  NetValue: number;
  ResponsibleID: number;
  ResponsibleNote?: string | null;
  Status: string;
}

export type AssetResponse<T> = ApiResponse<T>;
export type AssetListResponse = ApiListResponse<Asset>;
