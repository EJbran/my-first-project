import type { Transaction } from "sequelize";
import type { EntraClaims } from "./entraToken.service";
import { getUserTransitiveGroupIds } from "./microsoftGraph.service";
import { syncEntraGroupsToRoles as syncRoleMappings } from "./permission.service";

const hasGroupOverage = (claims: EntraClaims): boolean => {
  const claimNames = claims._claim_names as Record<string, string> | undefined;
  const hasClaimNamesOverage = claimNames?.groups === "src1";
  const hasHasGroups = Boolean(claims.hasGroupOverage || claims.hasgroups);
  return hasClaimNamesOverage || hasHasGroups;
};

const shouldForceGraphLookup = (): boolean =>
  String(process.env.ENTRA_GROUP_SYNC_MODE || "token_or_graph").toLowerCase() === "graph_only";

export const getGroupIdsFromTokenClaims = async (
  claims: EntraClaims,
  _accessToken: string
): Promise<string[]> => {
  const groupsFromToken = Array.isArray(claims.groups) ? claims.groups : [];
  const forceGraph = shouldForceGraphLookup();

  if (!forceGraph && groupsFromToken.length > 0) {
    return groupsFromToken;
  }

  if (!hasGroupOverage(claims) && !forceGraph) {
    return groupsFromToken;
  }

  return getUserTransitiveGroupIds(claims.oid);
};

export const syncEntraGroupsToRoles = async (
  userId: number,
  authDomainId: number,
  groupIds: string[],
  transaction?: Transaction
): Promise<void> => {
  await syncRoleMappings(userId, authDomainId, groupIds, transaction);
};
