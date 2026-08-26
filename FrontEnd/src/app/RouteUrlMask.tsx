import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { maskCurrentUrl } from "./routeObfuscation";

/** Syncs the address bar to the encrypted form after every route change. */
export function RouteUrlMask() {
  const location = useLocation();

  useEffect(() => {
    maskCurrentUrl(location.pathname, location.search, location.hash);
  }, [location.pathname, location.search, location.hash]);

  return null;
}
