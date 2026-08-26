import { Outlet, useLocation } from "react-router-dom";
import { AuthProvider } from "./auth/AuthProvider";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import { DashboardShell } from "./layouts/DashboardShell";
import { PublicLayout } from "./layouts/PublicLayout";
import { RouteUrlMask } from "./app/RouteUrlMask";

const publicPaths = new Set(["/login", "/signing-in", "/employee-link-required"]);

function App() {
  const location = useLocation();
  const isPublic = publicPaths.has(location.pathname);

  if (isPublic) {
    return (
      <AuthProvider>
        <RouteUrlMask />
        <PublicLayout>
          <Outlet />
        </PublicLayout>
      </AuthProvider>
    );
  }

  return (
    <AuthProvider>
      <RouteUrlMask />
      <ProtectedRoute>
        <DashboardShell>
          <Outlet />
        </DashboardShell>
      </ProtectedRoute>
    </AuthProvider>
  );
}

export default App;
