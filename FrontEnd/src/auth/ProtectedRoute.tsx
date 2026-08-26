import { type PropsWithChildren } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { AUTH_BYPASS } from "../app/constants";
import { useAuth } from "./useAuth";
import { LoadingScreen } from "../components/LoadingScreen";

export const ProtectedRoute = ({ children }: PropsWithChildren) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (AUTH_BYPASS) {
    return <>{children}</>;
  }

  if (isLoading) {
    return <LoadingScreen message="Checking your session..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
