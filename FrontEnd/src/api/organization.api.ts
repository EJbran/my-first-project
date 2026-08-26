import type { OrganizationHierarchyResponse } from "../types/organization.types";
import { httpClient } from "./httpClient";

export const organizationApi = {
  getHierarchy: async (params?: { rootId?: number; maxDepth?: number }) => {
    const response = await httpClient.get<OrganizationHierarchyResponse>(
      "/organization/hierarchy",
      { params }
    );
    return response.data;
  }
};
