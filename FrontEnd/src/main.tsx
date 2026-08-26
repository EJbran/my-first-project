import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { AppProviders } from "./app/providers";
import { router } from "./app/router";
import { installRouteObfuscation } from "./app/routeObfuscation";
import { hasEntraConfig } from "./app/constants";
import { bootstrapMsal } from "./auth/msalConfig";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element #root was not found");
}

// Must run before the router reads window.location.
installRouteObfuscation();

const startApp = async () => {
  if (hasEntraConfig()) {
    try {
      await bootstrapMsal();
    } catch (error) {
      console.error("[MSAL] Failed to initialize before app start", error);
    }
  }

  createRoot(rootElement).render(
    <StrictMode>
      <AppProviders>
        <RouterProvider router={router} />
      </AppProviders>
    </StrictMode>
  );
};

void startApp();
