import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import BarChartRoundedIcon from "@mui/icons-material/BarChartRounded";
import BusinessRoundedIcon from "@mui/icons-material/BusinessRounded";
import DarkModeRoundedIcon from "@mui/icons-material/DarkModeRounded";
import LightModeRoundedIcon from "@mui/icons-material/LightModeRounded";
import MicrosoftIcon from "@mui/icons-material/Microsoft";
import PhonelinkLockRoundedIcon from "@mui/icons-material/PhonelinkLockRounded";
import SecurityRoundedIcon from "@mui/icons-material/SecurityRounded";
import SettingsSuggestRoundedIcon from "@mui/icons-material/SettingsSuggestRounded";
import VpnKeyRoundedIcon from "@mui/icons-material/VpnKeyRounded";
import VerifiedUserRoundedIcon from "@mui/icons-material/VerifiedUserRounded";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import { useThemeMode } from "../app/themeMode";
import { AUTH_BYPASS, hasEntraConfig } from "../app/constants";
import { hasPendingAuthRedirect } from "../auth/msalConfig";
import { useAuth } from "../auth/useAuth";
import { Navigate } from "react-router-dom";

const NAVY = "#071f46";
const NAVY_DARK = "#03142f";
const RED = "#ed1c24";

const heroFeatures = [
  {
    icon: <SecurityRoundedIcon fontSize="small" />,
    title: "Secure & Reliable",
    subtitle: "Enterprise-grade security and data protection",
  },
  {
    icon: <SettingsSuggestRoundedIcon fontSize="small" />,
    title: "Integrated Operations",
    subtitle: "All modules in one controlled platform",
  },
  {
    icon: <BarChartRoundedIcon fontSize="small" />,
    title: "Data-Driven",
    subtitle: "Real-time visibility for better decisions",
  },
  {
    icon: <VerifiedUserRoundedIcon fontSize="small" />,
    title: "Governance",
    subtitle: "Roles, audit trails and compliance control",
  },
];

const footerItems = [
  {
    icon: <VpnKeyRoundedIcon fontSize="small" />,
    title: "Secure Login",
    subtitle: "SSL Encryption",
  },
  {
    icon: <SecurityRoundedIcon fontSize="small" />,
    title: "Microsoft Entra",
    subtitle: "Single Sign-On",
  },
  {
    icon: <PhonelinkLockRoundedIcon fontSize="small" />,
    title: "Authenticator MFA",
    subtitle: "Microsoft Authenticator",
  },
  {
    icon: <BusinessRoundedIcon fontSize="small" />,
    title: "Enterprise Access",
    subtitle: "Authorized Users",
  },
];

export default function LoginPage() {
  const theme = useTheme();
  const { mode, toggleMode } = useThemeMode();
  const isDark = mode === "dark";
  const { loginWithMicrosoft, isLoading, isAuthenticated } = useAuth();
  const entraReady = hasEntraConfig();
  const completingMicrosoftReturn = hasPendingAuthRedirect() || isLoading;

  if (AUTH_BYPASS) {
    return <Navigate to="/dashboard" replace />;
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <Box
      sx={{
        position: "relative",
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: { xs: 1, md: 2.4 },
        overflow: "hidden",
        background:
          mode === "dark"
            ? "radial-gradient(circle at 10% 0%, rgba(96,165,250,0.16), transparent 48%), radial-gradient(circle at 60% 60%, rgba(237,28,36,0.12), transparent 62%), linear-gradient(135deg, #08111f 0%, #0d1728 46%, #111827 100%)"
            : "radial-gradient(circle at 10% 0%, rgba(237,28,36,0.10), transparent 50%), radial-gradient(circle at 60% 60%, rgba(7,31,70,0.16), transparent 60%), linear-gradient(135deg, #eef2f8 0%, #e7edf6 50%)",
      }}
    >
      <Tooltip title={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}>
        <IconButton
          onClick={toggleMode}
          aria-label={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          sx={{
            position: "absolute",
            top: { xs: 12, md: 18 },
            right: { xs: 12, md: 18 },
            zIndex: 3,
            bgcolor: mode === "dark" ? "rgba(15, 23, 42, 0.72)" : "rgba(255,255,255,0.72)",
            color: mode === "dark" ? "common.white" : theme.palette.primary.main,
            border: 1,
            borderColor: mode === "dark" ? "rgba(148, 163, 184, 0.28)" : "rgba(189, 201, 219, 0.82)",
            backdropFilter: "blur(12px)"
          }}
        >
          {mode === "dark" ? <LightModeRoundedIcon fontSize="small" /> : <DarkModeRoundedIcon fontSize="small" />}
        </IconButton>
      </Tooltip>

      <Paper
        elevation={0}
        sx={{
          width: "100%",
          maxWidth: 1480,
          height: { xs: "auto", md: "min(790px, calc(100dvh - 44px))" },
          minHeight: { xs: "auto", md: 680 },
          borderRadius: { xs: 3, md: 4.8 },
          overflow: "hidden",
          border: `1px solid ${mode === "dark" ? "rgba(148, 163, 184, 0.22)" : "#d3deed"}`,
          boxShadow: mode === "dark" ? "0 32px 86px rgba(0, 0, 0, 0.52)" : "0 32px 86px rgba(9, 30, 66, 0.22)",
          display: "grid",
          gridTemplateRows: { xs: "1fr", md: "1fr 74px" },
          backgroundColor: mode === "dark" ? theme.palette.background.paper : "#f7f9fd",
        }}
      >
        <Box
          sx={{
            minHeight: 0,
            display: "grid",
            gridTemplateColumns: { xs: "1fr", lg: "1.12fr 0.88fr" },
            alignItems: "stretch",
          }}
        >
          <Box
            sx={{
              position: "relative",
              minHeight: { xs: 560, lg: 0 },
              height: "100%",
              color: "#fff",
              overflow: "hidden",
              backgroundImage:
                "linear-gradient(98deg, rgba(3,16,38,0.76) 0%, rgba(4,18,42,0.64) 46%, rgba(4,18,42,0.13) 84%, rgba(4,18,42,0.21) 100%), url('/login-refinery.png')",
              backgroundSize: "cover",
              backgroundPosition: "left center",
              borderRight: "none",
              isolation: "isolate",
            }}
          >
            <Box
              sx={{
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(112deg, rgba(4,19,45,0.72) 0%, rgba(5,24,54,0.58) 56%, rgba(5,24,54,0.58) 100%)",
                pointerEvents: "none",
                zIndex: 0,
              }}
            />

            <Box
              sx={{
                position: "absolute",
                right: 38,
                bottom: -86,
                width: 310,
                height: 170,
                borderRadius: "58% 0 0 0",
                background:
                  "linear-gradient(135deg, rgba(237,28,36,0.66), rgba(237,28,36,0.02))",
                transform: "rotate(-14deg)",
                opacity: 0.7,
                pointerEvents: "none",
                zIndex: 0,
              }}
            />

            <Stack
              sx={{
                position: "relative",
                zIndex: 1,
                height: "100%",
                p: { xs: 2.4, md: 3.5, xl: 4 },
                justifyContent: "space-between",
              }}
              spacing={2}
            >
              <Stack spacing={{ xs: 2, md: 2.35 }}>
                <Stack
                  direction="row"
                  alignItems="center"
                  spacing={{ xs: 1.6, md: 2 }}
                  sx={{
                    width: "100%",
                    maxWidth: "100%",
                    p: { xs: 1.15, md: 1.25 },
                    pr: { xs: 1.5, md: 1.8 },
                    borderRadius: { xs: 3, md: 4 },
                    background:
                      "linear-gradient(135deg, rgba(255,255,255,0.15), rgba(255,255,255,0.055))",
                    border: "1px solid rgba(255,255,255,0.18)",
                    boxShadow: "0 22px 58px rgba(0,0,0,0.20)",
                    backdropFilter: "blur(12px)",
                  }}
                >
                  <Box
                    sx={{
                      width: { xs: 112, md: 128, xl: 138 },
                      height: { xs: 112, md: 128, xl: 138 },
                      borderRadius: { xs: 3, md: 3.7 },
                      display: "grid",
                      placeItems: "center",
                      overflow: "hidden",
                      flex: "0 0 auto",
                      background: "rgba(214, 38, 49, 0.10)",
                      border: "1px solid rgba(255,255,255,0.88)",
                      boxShadow:
                        "0 18px 42px rgba(0,0,0,0.24), inset 0 1px 0 rgba(255, 255, 255, 0.25)",
                    }}
                  >
                    <Box
                      component="img"
                      src="/logo.png"
                      alt="Harouge IMS ERP logo"
                      sx={{
                        width: { xs: "124%", md: "122%" },
                        height: { xs: "124%", md: "122%" },
                        objectFit: "contain",
                        display: "block",
                        filter: "drop-shadow(0 8px 14px rgba(7,31,70,0.18))",
                      }}
                    />
                  </Box>

                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography
                      sx={{
                        fontSize: { xs: 27, md: 33, xl: 36 },
                        fontWeight: 950,
                        lineHeight: 1,
                        letterSpacing: { xs: 0.25, md: 0.75 },
                        textShadow: "0 10px 24px rgba(0, 0, 0, 0.07)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      HAROUGE
                    </Typography>

                    <Stack
                      direction="row"
                      spacing={0.75}
                      alignItems="center"
                      sx={{ mt: 0.9, flexWrap: "wrap" }}
                    >
                      <Box sx={brandBadgeSx}>IMS</Box>
                      <Box sx={brandBadgeOutlineSx}>ERP PLATFORM</Box>
                    </Stack>

                    <Typography
                      sx={{
                        mt: 1,
                        color: "rgba(255,255,255,0.76)",
                        fontWeight: 850,
                        fontSize: { xs: 11, md: 12.4 },
                        letterSpacing: 1.45,
                        textTransform: "uppercase",
                      }}
                    >
                      Oil Operations
                    </Typography>
                  </Box>

                  <Box
                    sx={{
                      display: { xs: "none", md: "flex" },
                      flexDirection: "column",
                      alignItems: "flex-end",
                      gap: 0.75,
                      minWidth: 128,
                      pl: 1.2,
                      borderLeft: "1px solid rgba(255,255,255,0.14)",
                    }}
                  >
                    <Typography
                      sx={{
                        color: "rgba(255,255,255,0.62)",
                        fontSize: 10.8,
                        fontWeight: 850,
                        letterSpacing: 1.2,
                        textTransform: "uppercase",
                      }}
                    >
                      Platform
                    </Typography>
                    <Box sx={miniStatusSx}>Secure</Box>
                    <Box sx={miniStatusSx}>Local AD</Box>
                  </Box>
                </Stack>

                <Box>
                  <Typography
                    sx={{
                      fontSize: { xs: 38, md: 48 },
                      fontWeight: 950,
                      lineHeight: 0.94,
                    }}
                  >
                    IMS
                  </Typography>
                  <Typography
                    sx={{
                      mt: 0.55,
                      fontSize: { xs: 13.5, md: 17 },
                      fontWeight: 850,
                    }}
                  >
                    INTEGRATED MANAGEMENT SYSTEM
                  </Typography>
                  <Box
                    sx={{
                      width: 70,
                      height: 3,
                      borderRadius: 99,
                      bgcolor: RED,
                      mt: 1.1,
                    }}
                  />
                </Box>

                <Box>
                  <Typography
                    sx={{
                      fontSize: { xs: 28, md: 35 },
                      fontWeight: 950,
                      lineHeight: 1.07,
                    }}
                  >
                    Secure. Integrated.
                    <Box component="span" sx={{ color: RED, display: "block" }}>
                      Enterprise Ready.
                    </Box>
                  </Typography>
                  <Typography
                    sx={{
                      mt: 1.15,
                      maxWidth: 555,
                      color: "rgba(255,255,255,0.90)",
                      fontSize: { xs: 13.5, md: 15 },
                      lineHeight: 1.55,
                    }}
                  >
                    A unified platform to manage your operations efficiently and
                    securely.
                  </Typography>
                </Box>
              </Stack>

              <Box
                sx={{
                  display: "grid",
                  width: "100%",
                  gridTemplateColumns: {
                    xs: "1fr",
                    sm: "repeat(2, minmax(0, 1fr))",
                  },
                  gap: 1.05,
                  maxWidth: "none",
                  pb: { xs: 0, md: 0.4 },
                }}
              >
                {heroFeatures.map((item) => (
                  <Stack
                    key={item.title}
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    sx={{
                      minHeight: 70,
                      p: 1.25,
                      borderRadius: 2.45,
                      background: "rgba(255,255,255,0.075)",
                      border: "1px solid rgba(255,255,255,0.13)",
                      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
                    }}
                  >
                    <Box
                      sx={{
                        width: 37,
                        height: 37,
                        borderRadius: "50%",
                        border: "1px solid rgba(255,255,255,0.28)",
                        display: "grid",
                        placeItems: "center",
                        bgcolor: "rgba(7,27,54,0.38)",
                        color: "#fff",
                        flex: "0 0 auto",
                      }}
                    >
                      {item.icon}
                    </Box>
                    <Box minWidth={0}>
                      <Typography sx={{ fontWeight: 850, fontSize: 13.2 }}>
                        {item.title}
                      </Typography>
                      <Typography
                        sx={{
                          color: "rgba(255,255,255,0.82)",
                          fontSize: 11.8,
                          lineHeight: 1.35,
                        }}
                      >
                        {item.subtitle}
                      </Typography>
                    </Box>
                  </Stack>
                ))}
              </Box>
            </Stack>
          </Box>

          <Box
            sx={{
              minHeight: 0,
              height: "100%",
              p: { xs: 2.2, md: 3.6, xl: 4.6 },
              background: mode === "dark" ? "linear-gradient(180deg, rgba(15, 23, 42, 0.98), rgba(17, 24, 39, 0.96))" : "#eef4fb",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <Box
              sx={{
                position: "absolute",
                width: 380,
                height: 380,
                right: -170,
                top: -170,
                borderRadius: "50%",
                background:
                  mode === "dark"
                    ? "radial-gradient(circle, rgba(148,163,184,0.10), transparent 68%)"
                    : "radial-gradient(circle, rgba(237,28,36,0.075), transparent 68%)",
                pointerEvents: "none",
              }}
            />
            <Box
              sx={{
                position: "absolute",
                width: 440,
                height: 440,
                left: -220,
                bottom: -220,
                borderRadius: "50%",
                background:
                  mode === "dark"
                    ? "radial-gradient(circle, rgba(96,165,250,0.10), transparent 68%)"
                    : "radial-gradient(circle, rgba(7,31,70,0.075), transparent 68%)",
                pointerEvents: "none",
              }}
            />

            <Paper
              elevation={0}
              sx={{
                position: "relative",
                width: "100%",
                maxWidth: 610,
                p: { xs: 2.35, md: 3.25 },
                borderRadius: 4.8,
                border: `1px solid ${mode === "dark" ? "rgba(148, 163, 184, 0.18)" : "rgba(189, 201, 219, 0.82)"}`,
                background: mode === "dark"
                  ? "linear-gradient(180deg, rgba(17,24,39,0.98), rgba(17,24,39,0.94))"
                  : "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(255,255,255,0.93))",
                boxShadow: mode === "dark"
                  ? "0 24px 70px rgba(0, 0, 0, 0.28), inset 0 1px 0 rgba(255,255,255,0.04)"
                  : "0 24px 70px rgba(8, 30, 66, 0.12), inset 0 1px 0 rgba(255,255,255,0.9)",
                overflow: "hidden",
              }}
            >
              <Box
                sx={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 6,
                  background: `linear-gradient(90deg, ${mode === "dark" ? "#8fb3ff" : NAVY} 0%, ${RED} 48%, ${mode === "dark" ? "#8fb3ff" : NAVY} 100%)`,
                }}
              />

              <Stack spacing={2.05}>
                <Box textAlign="center" sx={{ px: { xs: 0, md: 1 } }}>
                  <Box
                    sx={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 0.8,
                      px: 1.45,
                      py: 0.65,
                      mb: 1.2,
                      borderRadius: 999,
                      color: isDark ? "#e5eefc" : NAVY,
                      bgcolor: isDark ? "rgba(143,179,255,0.10)" : "#eef4fb",
                      border: isDark ? "1px solid rgba(143,179,255,0.22)" : "1px solid #dce6f3",
                      fontSize: 12.8,
                      fontWeight: 900,
                      letterSpacing: 0.8,
                      textTransform: "uppercase",
                    }}
                  >
                    <SecurityRoundedIcon sx={{ fontSize: 16, color: RED }} />
                    IMS Secure Access
                  </Box>

                  <Typography
                    sx={{
                      color: isDark ? "#eef4ff" : NAVY,
                      fontWeight: 950,
                      fontSize: { xs: 31, md: 39 },
                      lineHeight: 1,
                      letterSpacing: -0.6,
                    }}
                  >
                    Welcome Back
                  </Typography>
                  <Typography
                    sx={{
                      mt: 0.75,
                      color: isDark ? "rgba(226,232,240,0.72)" : "#53617b",
                      fontSize: { xs: 15, md: 18 },
                      fontWeight: 500,
                    }}
                  >
                    Sign in with your Microsoft work account
                  </Typography>
                </Box>

                <Box
                  sx={{
                    p: { xs: 1.55, md: 1.85 },
                    borderRadius: 3,
                    border: isDark ? "1px solid rgba(148,163,184,0.16)" : "1px solid #e0e7f2",
                    bgcolor: isDark ? "rgba(15, 23, 42, 0.72)" : "#fbfdff",
                    boxShadow: isDark
                      ? "inset 0 1px 0 rgba(255,255,255,0.04)"
                      : "inset 0 1px 0 rgba(255,255,255,0.85)",
                  }}
                >
                  <Stack spacing={1.4}>
                    <Button
                      type="button"
                      variant="contained"
                      fullWidth
                      disabled={isLoading || completingMicrosoftReturn}
                      startIcon={
                        completingMicrosoftReturn ? (
                          <CircularProgress size={18} color="inherit" />
                        ) : (
                          <MicrosoftIcon />
                        )
                      }
                      onClick={() => {
                        void loginWithMicrosoft();
                      }}
                      sx={{
                        height: 54,
                        borderRadius: 2.4,
                        bgcolor: isDark ? "#8fb3ff" : NAVY,
                        color: isDark ? "#08111f" : "#ffffff",
                        textTransform: "none",
                        fontWeight: 950,
                        fontSize: 17.5,
                        boxShadow: isDark
                          ? "0 12px 28px rgba(0,0,0,0.30)"
                          : "0 12px 28px rgba(7,31,70,0.18)",
                        "&:hover": {
                          bgcolor: isDark ? "#b8ccff" : NAVY_DARK,
                          color: isDark ? "#08111f" : "#ffffff",
                          boxShadow: isDark
                            ? "0 14px 32px rgba(0,0,0,0.36)"
                            : "0 14px 32px rgba(7,31,70,0.22)",
                        },
                      }}
                    >
                      {completingMicrosoftReturn
                        ? "Completing Microsoft sign-in…"
                        : "Sign in with Microsoft"}
                    </Button>

                    <Typography
                      sx={{
                        textAlign: "center",
                        color: isDark ? "rgba(226,232,240,0.62)" : "#64748f",
                        fontSize: 13,
                        lineHeight: 1.45,
                      }}
                    >
                      {completingMicrosoftReturn
                        ? "Waiting for Microsoft Authenticator / completing sync…"
                        : "Use Microsoft Authenticator (Approve or Enter code). Windows Hello face/PIN is not allowed."}
                    </Typography>
                  </Stack>
                </Box>

                {!entraReady ? (
                  <Alert
                    severity="info"
                    sx={{
                      borderRadius: 2.2,
                      py: 0.4,
                      "& .MuiAlert-message": { fontSize: 12.8 },
                    }}
                  >
                    Local setup incomplete: add SPA Client ID and API scope in FrontEnd
                    `.env`. Azure redirect URI for local:{" "}
                    <strong>http://localhost:5173/login</strong>
                  </Alert>
                ) : null}

                <Alert
                  severity="warning"
                  sx={{
                    borderRadius: 2.45,
                    bgcolor: isDark ? "rgba(180, 138, 49, 0.12)" : "#fffaf0",
                    border: isDark ? "1px solid rgba(245,158,11,0.28)" : "1px solid #efcf8c",
                    color: isDark ? "rgba(253,230,138,0.92)" : "#5b3d0c",
                    alignItems: "center",
                    "& .MuiAlert-icon": {
                      color: isDark ? "#fbbf24" : "#f59e0b",
                    },
                    "& .MuiAlert-message": {
                      fontSize: 13.6,
                      lineHeight: 1.5,
                      fontWeight: 500,
                    },
                  }}
                >
                  This system is for authorized IMS users only. All activities
                  are monitored and recorded.
                </Alert>

                <Box
                  sx={{
                    mt: 0.2,
                    px: 1.2,
                    py: 1.2,
                    borderRadius: 2.2,
                    border: isDark ? "1px solid rgba(237,28,36,0.38)" : "1px solid rgba(237,28,36,0.34)",
                    bgcolor: isDark ? "rgba(237,28,36,0.10)" : "rgba(237,28,36,0.08)",
                  }}
                >
                  <Chip
                    icon={<ErrorOutlineRoundedIcon sx={{ fontSize: 18 }} />}
                    label="Security Warning"
                    size="small"
                    sx={{
                      height: 26,
                      mb: 0.8,
                      bgcolor: isDark ? "rgba(237,28,36,0.18)" : "rgba(237,28,36,0.14)",
                      color: isDark ? "#ffb4b8" : "#b31319",
                      border: "1px solid rgba(237,28,36,0.38)",
                      fontWeight: 800,
                      letterSpacing: 0.2,
                      "& .MuiChip-icon": {
                        color: isDark ? "#ffb4b8" : "#b31319",
                      },
                    }}
                  />

                  <Typography sx={{ color: isDark ? "rgba(254,202,202,0.88)" : "#8b1116", fontSize: 12.8, lineHeight: 1.5, fontWeight: 600 }}>
                    Never share your Microsoft credentials with anyone, including IT staff.
                    <br />
                    IMS administrators will never request your password by phone or email.
                    <br />
                    Report suspicious login requests immediately to cybersecurity.
                  </Typography>
                </Box>
              </Stack>
            </Paper>
          </Box>
        </Box>

        <Box
          sx={{
            display: { xs: "none", md: "grid" },
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            borderTop: isDark ? "1px solid rgba(148,163,184,0.16)" : "1px solid #d8e1ee",
            bgcolor: isDark ? "rgba(15, 23, 42, 0.96)" : "rgba(255,255,255,0.96)",
          }}
        >
          {footerItems.map((item, index) => (
            <Stack
              key={item.title}
              direction="row"
              spacing={1.15}
              alignItems="center"
              sx={{
                px: { md: 2, xl: 3 },
                py: 1,
                borderRight:
                  index < footerItems.length - 1
                    ? isDark
                      ? "1px solid rgba(148,163,184,0.14)"
                      : "1px solid #e4eaf3"
                    : "none",
              }}
            >
              <Box
                sx={{
                  width: 38,
                  height: 38,
                  borderRadius: "50%",
                  display: "grid",
                  placeItems: "center",
                  border: isDark ? "1px solid rgba(148,163,184,0.18)" : "1px solid #d4ddea",
                  color: isDark ? "#e5eefc" : NAVY,
                  bgcolor: isDark ? "rgba(255,255,255,0.04)" : "#f8fbff",
                  flex: "0 0 auto",
                }}
              >
                {item.icon}
              </Box>

              <Box minWidth={0}>
                <Typography sx={{ fontWeight: 850, color: isDark ? "#eef4ff" : NAVY, fontSize: 14 }}>
                  {item.title}
                </Typography>
                <Typography sx={{ color: isDark ? "rgba(226,232,240,0.68)" : "#64748f", fontSize: 12 }}>
                  {item.subtitle}
                </Typography>
              </Box>
            </Stack>
          ))}
        </Box>
      </Paper>
    </Box>
  );
}

const brandBadgeSx = {
  px: 1.05,
  py: 0.32,
  borderRadius: 999,
  bgcolor: RED,
  color: "#fff",
  fontSize: { xs: 10.5, md: 11.2 },
  fontWeight: 900,
  lineHeight: 1,
  letterSpacing: 0.35,
};

const brandBadgeOutlineSx = {
  px: 1.05,
  py: 0.3,
  borderRadius: 999,
  color: "#fff",
  border: "1px solid rgba(255,255,255,0.48)",
  fontSize: { xs: 10.3, md: 11 },
  fontWeight: 900,
  lineHeight: 1,
  letterSpacing: 0.3,
  background: "rgba(255,255,255,0.08)",
};

const miniStatusSx = {
  px: 1.05,
  py: 0.38,
  minWidth: 72,
  textAlign: "center",
  borderRadius: 999,
  color: "rgba(255,255,255,0.88)",
  border: "1px solid rgba(255,255,255,0.18)",
  background: "rgba(255,255,255,0.075)",
  fontSize: 11,
  fontWeight: 850,
  lineHeight: 1,
};
