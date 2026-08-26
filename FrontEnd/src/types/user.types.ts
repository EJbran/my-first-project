import type { AuthProvider, ID } from "./common.types";

export interface User {
  id: ID;
  username: string;
  displayName: string;
  email: string;
  phone?: string;
  profileImageUrl?: string;
  userPrincipalName?: string;
  employeeId?: number;
  departmentId?: number;
  employeeName?: string;
  employeeNameEn?: string;
  departmentNameAr?: string;
  departmentNameEn?: string;
  jobTitle?: string;
  jobNameAr?: string;
  jobNameEn?: string;
  lineLevelNameAr?: string;
  lineLevelNameEn?: string;
  authProvider: AuthProvider;
  isActive: boolean;
  isLocked: boolean;
  lastLoginAt?: string;
}

export interface UserSession {
  id: ID;
  userId: ID;
  ipAddress?: string;
  userAgent?: string;
  isActive: boolean;
  createdAt: string;
  expiresAt?: string;
}

export interface LoginAttempt {
  id: ID;
  userId?: ID;
  username?: string;
  email?: string;
  authProvider: AuthProvider;
  isSuccessful: boolean;
  reason?: string;
  createdAt: string;
}
