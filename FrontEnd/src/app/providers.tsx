import { CssBaseline, ThemeProvider } from "@mui/material";
import { SnackbarProvider } from "notistack";
import { useMemo, type PropsWithChildren } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeModeSync } from "./ThemeModeSync";
import { createImsAppTheme } from "./theme";
import { ThemeModeProvider, useThemeMode } from "./themeMode";

const queryClient = new QueryClient();

const AppThemeProviders = ({ children }: PropsWithChildren) => {
  const { mode } = useThemeMode();
  const theme = useMemo(() => createImsAppTheme(), []);

  return (
    <ThemeProvider
      theme={theme}
      defaultMode={mode}
      colorSchemeStorageKey="toolpad-color-scheme"
      modeStorageKey="toolpad-mode"
    >
      <ThemeModeSync />
      <CssBaseline enableColorScheme />
      <SnackbarProvider maxSnack={4} anchorOrigin={{ vertical: "top", horizontal: "right" }}>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </SnackbarProvider>
    </ThemeProvider>
  );
};

export const AppProviders = ({ children }: PropsWithChildren) => (
  <ThemeModeProvider>
    <AppThemeProviders>{children}</AppThemeProviders>
  </ThemeModeProvider>
);
