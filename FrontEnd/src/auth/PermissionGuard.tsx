import { type PropsWithChildren } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { AUTH_BYPASS } from "../app/constants";
import { useAuth } from "./useAuth";

interface PermissionGuardProps extends PropsWithChildren {
  allOf?: string[];
  anyOf?: string[];
}

export const PermissionGuard = ({ children, allOf, anyOf }: PermissionGuardProps) => {
  const { hasAllPermissions, hasAnyPermission } = useAuth();
  const location = useLocation();

  if (AUTH_BYPASS) {
    return <>{children}</>;
  }

  if (allOf && !hasAllPermissions(allOf)) {
    return <Navigate to="/403" state={{ from: location }} replace />;
  }

  if (anyOf && !hasAnyPermission(anyOf)) {
    return <Navigate to="/403" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
