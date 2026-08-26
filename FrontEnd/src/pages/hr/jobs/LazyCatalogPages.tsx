import { lazy } from "react";

export const LazyJobCatalogPage = lazy(() => import("./JobCatalogPage"));
export const LazyJobProfilePage = lazy(() => import("./JobProfilePage"));
export const LazyPositionsPage = lazy(() => import("./PositionsPage"));
