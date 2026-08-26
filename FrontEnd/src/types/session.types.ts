import type { ID } from "./common.types";

export interface SessionRecord {
  id: ID;
  userId: ID;
  isActive: boolean;
  createdAt: string;
  expiresAt?: string;
  revokedAt?: string;
}
