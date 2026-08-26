import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from "react";

export type ThemeMode = "light" | "dark";

interface ThemeModeContextValue {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
}

const THEME_MODE_KEY = "toolpad-mode";
const COLOR_SCHEME_KEY = "toolpad-color-scheme";
const COLOR_SCHEME_ATTRIBUTE = "data-toolpad-color-scheme";

const ThemeModeContext = createContext<ThemeModeContextValue | undefined>(undefined);

const getStoredMode = (): ThemeMode | null => {
  if (typeof window === "undefined") {
    return null;
  }

  const storedMode = window.localStorage.getItem(THEME_MODE_KEY);
  return storedMode === "light" || storedMode === "dark" ? storedMode : null;
};

const getSystemMode = (): ThemeMode => {
  if (typeof window === "undefined") {
    return "light";
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

export const ThemeModeProvider = ({ children }: PropsWithChildren) => {
  const [mode, setMode] = useState<ThemeMode>(() => getStoredMode() ?? getSystemMode());

  useEffect(() => {
    window.localStorage.setItem(THEME_MODE_KEY, mode);
    window.localStorage.setItem(COLOR_SCHEME_KEY, mode);
    document.documentElement.setAttribute(COLOR_SCHEME_ATTRIBUTE, mode);
    document.documentElement.style.colorScheme = mode;
  }, [mode]);

  const value = useMemo(
    () => ({
      mode,
      setMode,
      toggleMode: () => {
        setMode((current) => (current === "light" ? "dark" : "light"));
      }
    }),
    [mode]
  );

  return <ThemeModeContext.Provider value={value}>{children}</ThemeModeContext.Provider>;
};

export const useThemeMode = () => {
  const context = useContext(ThemeModeContext);
  if (!context) {
    throw new Error("useThemeMode must be used within a ThemeModeProvider");
  }

  return context;
};