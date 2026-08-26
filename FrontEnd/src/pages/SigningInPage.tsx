import {
  Box,
  Chip,
  LinearProgress,
  Paper,
  Stack,
  Typography
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { keyframes } from "@mui/system";
import type { ElementType } from "react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";
import AssessmentRoundedIcon from "@mui/icons-material/AssessmentRounded";
import PeopleAltRoundedIcon from "@mui/icons-material/PeopleAltRounded";
import AccountTreeRoundedIcon from "@mui/icons-material/AccountTreeRounded";
import SettingsSuggestRoundedIcon from "@mui/icons-material/SettingsSuggestRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import LocalShippingRoundedIcon from "@mui/icons-material/LocalShippingRounded";
import AccountBalanceRoundedIcon from "@mui/icons-material/AccountBalanceRounded";
import PaymentsRoundedIcon from "@mui/icons-material/PaymentsRounded";
import FactoryRoundedIcon from "@mui/icons-material/FactoryRounded";
import StorefrontRoundedIcon from "@mui/icons-material/StorefrontRounded";
import PieChartRoundedIcon from "@mui/icons-material/PieChartRounded";
import SecurityRoundedIcon from "@mui/icons-material/SecurityRounded";
import RocketLaunchRoundedIcon from "@mui/icons-material/RocketLaunchRounded";
import DashboardCustomizeRoundedIcon from "@mui/icons-material/DashboardCustomizeRounded";

import { useAuth } from "../auth/useAuth";

const floatY = keyframes`
  0% {
    transform: translateY(0px) translateX(0px) rotate(0deg);
  }
  50% {
    transform: translateY(-16px) translateX(8px) rotate(4deg);
  }
  100% {
    transform: translateY(0px) translateX(0px) rotate(0deg);
  }
`;

const pulseGlow = keyframes`
  0% {
    opacity: 0.22;
    transform: scale(1);
  }
  50% {
    opacity: 0.52;
    transform: scale(1.04);
  }
  100% {
    opacity: 0.22;
    transform: scale(1);
  }
`;

const rotateRing = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`;

const shimmer = keyframes`
  0% {
    transform: translateX(-120%);
  }
  100% {
    transform: translateX(120%);
  }
`;

type FloatingIconItem = {
  icon: ElementType;
  top: string;
  left?: string;
  right?: string;
  size: number;
  delay: string;
  duration: string;
  color: string;
};

const floatingIcons: FloatingIconItem[] = [
  {
    icon: Inventory2RoundedIcon,
    top: "13%",
    left: "9%",
    size: 30,
    delay: "0s",
    duration: "8.5s",
    color: "#60a5fa"
  },
  {
    icon: AssessmentRoundedIcon,
    top: "23%",
    right: "11%",
    size: 34,
    delay: "1.2s",
    duration: "9.2s",
    color: "#22d3ee"
  },
  {
    icon: PeopleAltRoundedIcon,
    top: "69%",
    left: "10%",
    size: 32,
    delay: "0.6s",
    duration: "8.8s",
    color: "#34d399"
  },
  {
    icon: AccountTreeRoundedIcon,
    top: "71%",
    right: "12%",
    size: 33,
    delay: "1.8s",
    duration: "9.6s",
    color: "#f59e0b"
  },
  {
    icon: SettingsSuggestRoundedIcon,
    top: "47%",
    left: "19%",
    size: 30,
    delay: "2.4s",
    duration: "10s",
    color: "#f43f5e"
  },
  {
    icon: ReceiptLongRoundedIcon,
    top: "43%",
    right: "20%",
    size: 30,
    delay: "0.9s",
    duration: "9.4s",
    color: "#a78bfa"
  },
  {
    icon: LocalShippingRoundedIcon,
    top: "18%",
    left: "27%",
    size: 29,
    delay: "1.6s",
    duration: "9.1s",
    color: "#06b6d4"
  },
  {
    icon: AccountBalanceRoundedIcon,
    top: "18%",
    right: "27%",
    size: 29,
    delay: "2.1s",
    duration: "9.7s",
    color: "#84cc16"
  },
  {
    icon: PaymentsRoundedIcon,
    top: "58%",
    left: "5%",
    size: 28,
    delay: "0.5s",
    duration: "8.7s",
    color: "#f97316"
  },
  {
    icon: FactoryRoundedIcon,
    top: "57%",
    right: "6%",
    size: 31,
    delay: "1.4s",
    duration: "9.9s",
    color: "#eab308"
  },
  {
    icon: StorefrontRoundedIcon,
    top: "34%",
    left: "5%",
    size: 27,
    delay: "2.8s",
    duration: "10.4s",
    color: "#2dd4bf"
  },
  {
    icon: PieChartRoundedIcon,
    top: "34%",
    right: "5%",
    size: 27,
    delay: "3.1s",
    duration: "10.1s",
    color: "#fb7185"
  }
];

 

export default function SigningInPage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  const isDark = theme.palette.mode === "dark";
  const displayName = user?.displayName ?? "User";

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login", { replace: true });
      return;
    }

    const timer = window.setTimeout(() => {
      navigate("/dashboard", { replace: true });
    }, 10000);

    return () => window.clearTimeout(timer);
  }, [isAuthenticated, navigate]);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <Box
      sx={{
        position: "relative",
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        px: { xs: 2, sm: 3 },
        py: 4,
        overflow: "hidden",
        color: "text.primary",
        background: isDark
          ? `
            radial-gradient(circle at 16% 12%, ${alpha("#60a5fa", 0.22)} 0%, transparent 34%),
            radial-gradient(circle at 84% 20%, ${alpha("#22d3ee", 0.16)} 0%, transparent 32%),
            radial-gradient(circle at 50% 90%, ${alpha("#a78bfa", 0.14)} 0%, transparent 38%),
            linear-gradient(135deg, #07111f 0%, #0f172a 48%, #111827 100%)
          `
          : `
            radial-gradient(circle at 16% 12%, ${alpha(theme.palette.primary.main, 0.14)} 0%, transparent 34%),
            radial-gradient(circle at 84% 20%, ${alpha("#2563eb", 0.12)} 0%, transparent 32%),
            radial-gradient(circle at 50% 90%, ${alpha("#14b8a6", 0.1)} 0%, transparent 38%),
            linear-gradient(135deg, #f7f9fd 0%, #eef3fa 48%, #ffffff 100%)
          `,
        "&::before": {
          content: '""',
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          opacity: isDark ? 0.18 : 0.35,
          backgroundImage: `
            linear-gradient(${alpha(theme.palette.text.primary, 0.08)} 1px, transparent 1px),
            linear-gradient(90deg, ${alpha(theme.palette.text.primary, 0.08)} 1px, transparent 1px)
          `,
          backgroundSize: "46px 46px",
          maskImage:
            "radial-gradient(circle at center, black 0%, transparent 72%)"
        },
        "&::after": {
          content: '""',
          position: "absolute",
          width: 520,
          height: 520,
          borderRadius: "50%",
          right: { xs: -320, md: -160 },
          bottom: { xs: -340, md: -230 },
          background: isDark
            ? alpha("#38bdf8", 0.1)
            : alpha(theme.palette.primary.main, 0.08),
          filter: "blur(8px)",
          pointerEvents: "none"
        }
      }}
    >
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          zIndex: 0
        }}
      >
        {floatingIcons.map((item, index) => {
          const Icon = item.icon;

          return (
            <Box
              key={`${item.top}-${index}`}
              sx={{
                position: "absolute",
                top: item.top,
                left: item.left,
                right: item.right,
                width: item.size + 24,
                height: item.size + 24,
                borderRadius: "22px",
                display: {
                  xs: index > 3 ? "none" : "grid",
                  md: "grid"
                },
                placeItems: "center",
                color: item.color,
                bgcolor: isDark
                  ? alpha("#0f172a", 0.62)
                  : alpha("#ffffff", 0.72),
                border: `1px solid ${
                  isDark
                    ? alpha("#e2e8f0", 0.16)
                    : alpha("#0f172a", 0.1)
                }`,
                boxShadow: isDark
                  ? `0 18px 40px ${alpha("#000000", 0.26)}`
                  : `0 18px 40px ${alpha("#0f172a", 0.12)}`,
                backdropFilter: "blur(10px)",
                animation: `${floatY} ${item.duration} ease-in-out ${item.delay} infinite, ${pulseGlow} 5s ease-in-out ${item.delay} infinite`
              }}
            >
              <Icon sx={{ fontSize: item.size }} />
            </Box>
          );
        })}
      </Box>

      <Paper
        elevation={0}
        sx={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          maxWidth: 660,
          overflow: "hidden",
          borderRadius: { xs: 4, md: 6 },
          p: { xs: 3, sm: 4, md: 4.5 },
          border: `1px solid ${
            isDark ? alpha("#e2e8f0", 0.14) : alpha("#0f172a", 0.1)
          }`,
          bgcolor: isDark ? alpha("#0f172a", 0.88) : alpha("#ffffff", 0.88),
          backdropFilter: "blur(22px)",
          boxShadow: isDark
            ? `0 34px 100px ${alpha("#000000", 0.5)}`
            : `0 34px 100px ${alpha("#0f172a", 0.16)}`,
          "&::before": {
            content: '""',
            position: "absolute",
            inset: 0,
            height: 5,
            background: `linear-gradient(90deg, ${theme.palette.primary.main}, #2563eb, #14b8a6)`
          },
          "&::after": {
            content: '""',
            position: "absolute",
            top: 5,
            left: 0,
            width: "45%",
            height: "100%",
            pointerEvents: "none",
            background: `linear-gradient(90deg, transparent, ${alpha(
              "#ffffff",
              isDark ? 0.06 : 0.38
            )}, transparent)`,
            animation: `${shimmer} 4.5s ease-in-out infinite`
          }
        }}
      >
        <Stack spacing={2.6} alignItems="center" textAlign="center">
          <Box
            sx={{
              width: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              pt: { xs: 0.5, md: 1 },
              pb: { xs: 0.5, md: 1.2 }
            }}
          >
           
              <Box
                component="img"
                src="/logo.png"
                alt="IMS logo"
                sx={{
                  width: { xs: 150, md: 170 },
                  height: { xs: 150, md: 170 },
                
                  display: "block",
               
                
                }}
              />
        

            <Typography
              sx={{
                fontSize: { xs: 30, md: 38 },
                fontWeight: 950,
                lineHeight: 1,
                letterSpacing: -1,
                color: "text.primary"
              }}
            >
              IMS System
            </Typography>

            <Typography
              sx={{
                mt: 1,
                px: 2,
                py: 0.7,
                borderRadius: 999,
                fontSize: { xs: 13.5, md: 14.5 },
                fontWeight: 800,
                color: "text.secondary",
                bgcolor: isDark ? alpha("#ffffff", 0.06) : alpha("#0f172a", 0.045),
                border: `1px solid ${
                  isDark ? alpha("#ffffff", 0.08) : alpha("#0f172a", 0.06)
                }`
              }}
            >
              Integrated Management Platform
            </Typography>
          </Box>

          <Box
            sx={{
              position: "relative",
              width: 108,
              height: 108,
              display: "grid",
              placeItems: "center"
            }}
          >
            <Box
              sx={{
                position: "absolute",
                inset: 0,
                borderRadius: "50%",
                border: `1px dashed ${alpha(theme.palette.primary.main, 0.42)}`,
                animation: `${rotateRing} 10s linear infinite`
              }}
            />

            <Box
              sx={{
                position: "absolute",
                inset: 14,
                borderRadius: "50%",
                bgcolor: alpha(theme.palette.success.main, isDark ? 0.14 : 0.1),
                boxShadow: `0 0 0 12px ${alpha(
                  theme.palette.success.main,
                  isDark ? 0.06 : 0.08
                )}`
              }}
            />

            <Box
              sx={{
                position: "relative",
                width: 72,
                height: 72,
                borderRadius: "50%",
                display: "grid",
                placeItems: "center",
                color: theme.palette.success.main,
                bgcolor: isDark ? alpha("#020617", 0.72) : "#ffffff",
                border: `1px solid ${alpha(theme.palette.success.main, 0.22)}`,
                boxShadow: `0 18px 38px ${alpha(
                  theme.palette.success.main,
                  0.22
                )}`
              }}
            >
              <CheckCircleRoundedIcon sx={{ fontSize: 44 }} />
            </Box>
          </Box>

          <Stack spacing={1.1} alignItems="center">
            <Chip
              icon={<SecurityRoundedIcon />}
              label="Secure session verified"
              sx={{
                height: 34,
                px: 0.6,
                fontWeight: 800,
                borderRadius: 999,
                color: isDark ? "#bfdbfe" : theme.palette.primary.main,
                bgcolor: isDark
                  ? alpha(theme.palette.primary.main, 0.14)
                  : alpha(theme.palette.primary.main, 0.08),
                border: `1px solid ${alpha(theme.palette.primary.main, 0.16)}`,
                "& .MuiChip-icon": {
                  color: "inherit"
                }
              }}
            />

            <Typography
              variant="h4"
              sx={{
                fontWeight: 950,
                letterSpacing: -0.8,
                color: "text.primary",
                fontSize: { xs: 28, md: 36 }
              }}
            >
              Welcome, {displayName}
            </Typography>

            <Typography
              sx={{
                maxWidth: 480,
                color: "text.secondary",
                fontSize: { xs: 15, md: 16 },
                lineHeight: 1.7
              }}
            >
              Your workspace is being prepared. We are loading your dashboard,
              modules, permissions, and latest business data.
            </Typography>
          </Stack>

          <Box
            sx={{
              width: "100%",
              p: { xs: 2, sm: 2.4 },
              borderRadius: 4,
              bgcolor: isDark ? alpha("#020617", 0.34) : alpha("#f8fafc", 0.9),
              border: `1px solid ${
                isDark ? alpha("#ffffff", 0.1) : alpha("#0f172a", 0.08)
              }`
            }}
          >
            <Stack spacing={2}>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1.2}
                justifyContent="space-between"
                alignItems={{ xs: "stretch", sm: "center" }}
              >
                <Stack direction="row" spacing={1.2} alignItems="center">
                  <Box
                    sx={{
                      width: 38,
                      height: 38,
                      borderRadius: "14px",
                      display: "grid",
                      placeItems: "center",
                      color: theme.palette.primary.main,
                      bgcolor: alpha(theme.palette.primary.main, 0.1)
                    }}
                  >
                    <RocketLaunchRoundedIcon />
                  </Box>

                  <Box textAlign="left">
                    <Typography sx={{ fontWeight: 900, fontSize: 14.5 }}>
                      Opening dashboard
                    </Typography>
                    <Typography sx={{ color: "text.secondary", fontSize: 13 }}>
                      Redirecting automatically
                    </Typography>
                  </Box>
                </Stack>

                <Chip
                  size="small"
                  icon={<DashboardCustomizeRoundedIcon />}
                  label="Loading"
                  sx={{
                    alignSelf: { xs: "flex-start", sm: "center" },
                    fontWeight: 800,
                    bgcolor: isDark
                      ? alpha("#ffffff", 0.07)
                      : alpha(theme.palette.primary.main, 0.08),
                    "& .MuiChip-icon": {
                      color: theme.palette.primary.main
                    }
                  }}
                />
              </Stack>

              <LinearProgress
                sx={{
                  height: 10,
                  borderRadius: 999,
                  bgcolor: isDark
                    ? alpha("#94a3b8", 0.14)
                    : alpha("#64748b", 0.14),
                  overflow: "hidden",
                  "& .MuiLinearProgress-bar": {
                    borderRadius: 999,
                    background: `linear-gradient(90deg, ${theme.palette.primary.main}, #2563eb, #14b8a6)`
                  }
                }}
              />

              <Typography
                sx={{
                  fontSize: 13.5,
                  color: "text.secondary",
                  fontWeight: 600
                }}
              >
                Please wait while we prepare your IMS workspace...
              </Typography>
            </Stack>
          </Box>

          
        </Stack>
      </Paper>
    </Box>
  );
}