import { useColorScheme } from "@mui/material/styles";
import { useEffect } from "react";
import { useThemeMode } from "../app/themeMode";

export const ThemeModeSync = () => {
  const { mode } = useThemeMode();
  const { setMode } = useColorScheme();

  useEffect(() => {
    setMode(mode);
  }, [mode, setMode]);

  return null;
};
