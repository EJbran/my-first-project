import { createTheme } from "@mui/material/styles";
import type { ThemeMode } from "./themeMode";

const sharedThemeOptions = {
  shape: {
    borderRadius: 10
  },
  typography: {
    fontFamily: '"Segoe UI", "Arial", sans-serif',
    h4: { fontWeight: 700 },
    h5: { fontWeight: 700 },
    h6: { fontWeight: 700 }
  }
};

const lightPalette = {
  primary: {
    main: "#0b1f3a",
    light: "#1c355d",
    dark: "#071329",
    contrastText: "#ffffff"
  },
  secondary: {
    main: "#c62828",
    light: "#e53935",
    dark: "#8e0000",
    contrastText: "#ffffff"
  },
  background: {
    default: "#f3f5f8",
    paper: "#ffffff"
  },
  divider: "rgba(15, 23, 42, 0.12)"
};

const darkPalette = {
  primary: {
    main: "#8fb3ff",
    light: "#b8ccff",
    dark: "#5f86e8",
    contrastText: "#08111f"
  },
  secondary: {
    main: "#ff8a80",
    light: "#ffb3ab",
    dark: "#d14b45",
    contrastText: "#200606"
  },
  background: {
    default: "#0b1220",
    paper: "#111827"
  },
  divider: "rgba(148, 163, 184, 0.18)"
};

export const createImsAppTheme = () =>
  createTheme({
    ...sharedThemeOptions,
    cssVariables: {
      colorSchemeSelector: "data-toolpad-color-scheme"
    },
    colorSchemes: {
      light: {
        palette: lightPalette
      },
      dark: {
        palette: darkPalette
      }
    }
  });

export const createImsTheme = (mode: ThemeMode) => {
  const isDark = mode === "dark";

  return createTheme({
    palette: {
      mode,
      ...(isDark ? darkPalette : lightPalette)
    },
    ...sharedThemeOptions,
    components: {
      MuiCard: {
        styleOverrides: {
          root: {
            boxShadow: isDark ? "0 12px 28px rgba(0,0,0,0.34)" : "0 8px 24px rgba(11,31,58,0.08)"
          }
        }
      }
    }
  });
};
