import DarkModeRoundedIcon from "@mui/icons-material/DarkModeRounded";
import LightModeRoundedIcon from "@mui/icons-material/LightModeRounded";
import { Box, IconButton, Tooltip } from "@mui/material";
import { useColorScheme } from "@mui/material/styles";
import { useThemeMode } from "../app/themeMode";

export const DashboardThemeToggle = () => {
  const { setMode: setThemeMode } = useThemeMode();
  const { mode, setMode, systemMode } = useColorScheme();
  const paletteMode = mode === "system" ? systemMode : mode;

  if (!paletteMode) {
    return null;
  }

  const toggleMode = () => {
    const nextMode = paletteMode === "dark" ? "light" : "dark";
    setMode(nextMode);
    setThemeMode(nextMode);
  };

  return (
    <Box display="flex" alignItems="center">
      <Tooltip title={paletteMode === "dark" ? "Switch to light mode" : "Switch to dark mode"}>
        <IconButton
          onClick={toggleMode}
          aria-label={paletteMode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          size="small"
          sx={{ border: 1, borderColor: "divider", bgcolor: "background.paper" }}
        >
          {paletteMode === "dark" ? <LightModeRoundedIcon fontSize="small" /> : <DarkModeRoundedIcon fontSize="small" />}
        </IconButton>
      </Tooltip>
    </Box>
  );
};
