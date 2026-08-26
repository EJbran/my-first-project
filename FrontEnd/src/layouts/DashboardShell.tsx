import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import ApartmentRoundedIcon from "@mui/icons-material/ApartmentRounded";
import EmailRoundedIcon from "@mui/icons-material/EmailRounded";
import LocalPhoneRoundedIcon from "@mui/icons-material/LocalPhoneRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import WorkOutlineRoundedIcon from "@mui/icons-material/WorkOutlineRounded";
import { Avatar, Box, Button, Divider, Menu, Stack, Typography } from "@mui/material";
import { AppProvider } from "@toolpad/core/AppProvider";
import type { Navigation, Router } from "@toolpad/core/AppProvider";
import { PageContainer } from "@toolpad/core/PageContainer";
import { useMemo, useState, type PropsWithChildren } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { APP_NAME, AUTH_BYPASS } from "../app/constants";
import { navigation, navPermissions } from "../app/navigation";
import { createImsAppTheme } from "../app/theme";
import { useAuth } from "../auth/useAuth";
import { DashboardThemeToggle } from "../components/DashboardThemeToggle";
import {
  AppSidebar,
  SIDEBAR_COMPACT_WIDTH,
  SIDEBAR_EXPANDED_WIDTH,
  SIDEBAR_HEADER_HEIGHT,
  SIDEBAR_TRANSITION
} from "./AppSidebar";

const FULL_WIDTH_DATA_PATHS = new Set([
  "/setup/general/location",
  "/setup/general/departments",
  "/setup/general/epsas",
  "/setup/finance/banks",
  "/setup/finance/bank-generals",
  "/setup/finance/bank-serial-checks",
  "/setup/finance/chart-groups",
  "/setup/finance/chart-of-accounts",
  "/setup/finance/account-mappings",
  "/setup/hr/time-sheet-codes",
  "/setup/hr/holidays",
  "/afe/afes",
  "/human-resources/timesheets-attendance/timesheets"
]);

const EmptyPageHeader = () => null;

const filterNavigation = (
  items: Navigation,
  permissions: string[],
  parentPath = ""
): Navigation => {
  if (AUTH_BYPASS) return items;

  return items.flatMap((item) => {
    if (item.kind && item.kind !== "page") return [item];

    const segment = item.segment ?? "";
    const path =
      parentPath && !segment.includes("/") ? `${parentPath}/${segment}` : `/${segment}`;
    const permissionConfig = navPermissions.find((entry) => entry.path === path);
    const allowed = !permissionConfig?.permissions?.length
      ? true
      : permissionConfig.requireAll
        ? permissionConfig.permissions.every((permission) => permissions.includes(permission))
        : permissionConfig.permissions.some((permission) => permissions.includes(permission));

    if (!allowed) return [];

    return [
      {
        ...item,
        children: item.children
          ? filterNavigation(item.children, permissions, path)
          : undefined
      }
    ];
  });
};

export const DashboardShell = ({ children }: PropsWithChildren) => {
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useMemo(() => createImsAppTheme(), []);
  const { user, roles, permissions, logout } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [profileInfoAnchor, setProfileInfoAnchor] = useState<HTMLElement | null>(null);

  const isEmployeesListPage = location.pathname === "/human-resources/employees/employees-list";
  const isEmployeeProfilePage = location.pathname.startsWith(
    "/human-resources/employees/employee-profile/"
  );
  const isHrDashboardPage = location.pathname === "/human-resources/hr-dashboard";
  const isReportsPage = location.pathname === "/human-resources/reports";
  const isTimesheetsPage =
    location.pathname === "/human-resources/timesheets-attendance/timesheets";
  const isJobsPage =
    location.pathname === "/human-resources/jobs" || location.pathname.startsWith("/human-resources/jobs/");
  const isHrDataPage =
    isEmployeesListPage ||
    isEmployeeProfilePage ||
    isHrDashboardPage ||
    isReportsPage ||
    isTimesheetsPage ||
    isJobsPage;
  const isFullWidthDataPage =
    isHrDataPage || FULL_WIDTH_DATA_PATHS.has(location.pathname);
  const isDepartmentsPage = location.pathname === "/setup/general/departments";
  const headerEmployeeName = user?.employeeNameEn || user?.employeeName || user?.displayName || "";
  const headerEmployeeNameAr = user?.employeeName || "";
  const headerEmail = user?.email || "";
  const headerPhone = user?.phone || "";
  const headerJobName = user?.jobNameEn || user?.jobNameAr || user?.jobTitle || "";
  const headerLevelName = user?.lineLevelNameEn || user?.lineLevelNameAr || "";
  const headerDepartment = user?.departmentNameEn || user?.departmentNameAr || "";
  const headerProfileImageUrl = user?.profileImageUrl?.trim() || "/logo.png";
  const profileInfoOpen = Boolean(profileInfoAnchor);

  const router: Router = useMemo(
    () => ({
      pathname: location.pathname,
      searchParams: new URLSearchParams(location.search),
      navigate: (to) => navigate(typeof to === "string" ? to : to.toString())
    }),
    [location.pathname, location.search, navigate]
  );

  const filteredNavigation = useMemo(
    () => filterNavigation(navigation, permissions),
    [permissions]
  );
  const sidebarWidth = sidebarCollapsed ? SIDEBAR_COMPACT_WIDTH : SIDEBAR_EXPANDED_WIDTH;

  return (
    <AppProvider
      theme={theme}
      navigation={filteredNavigation}
      router={router}
      branding={{ title: APP_NAME, homeUrl: "/dashboard" }}
      session={{ user: { name: user?.displayName, email: user?.email } }}
      authentication={{ signIn: () => navigate("/login"), signOut: () => void logout() }}
    >
      <Box
        sx={{
          minHeight: "100vh",
          bgcolor: "background.default",
          "--app-sidebar-header-height": `${SIDEBAR_HEADER_HEIGHT}px`
        }}
      >
        <AppSidebar
          navigation={filteredNavigation}
          pathname={location.pathname}
          displayName={user?.displayName ?? "Unknown User"}
          roles={roles}
          collapsed={sidebarCollapsed}
          mobileOpen={mobileSidebarOpen}
          onCollapsedChange={setSidebarCollapsed}
          onMobileOpenChange={setMobileSidebarOpen}
          onNavigate={navigate}
          onLogout={() => void logout()}
        />

        <Box
          component="main"
          sx={{
            minWidth: 0,
            width: { xs: "100%", md: `calc(100% - ${sidebarWidth}px)` },
            minHeight: "100vh",
            ml: { xs: 0, md: `${sidebarWidth}px` },
            pt: { xs: 6.5, md: 0 },
            bgcolor: "background.default",
            transition: `margin-left ${SIDEBAR_TRANSITION}, width ${SIDEBAR_TRANSITION}`
          }}
        >
          <Box
            sx={{
              display: "flex",
              justifyContent: "flex-end",
              alignItems: "center",
              px: { xs: 2, md: 3.5 },
              pt: { xs: 2, md: 2.25 },
              pb: 0.5
            }}
          >
            {(headerEmployeeName || headerJobName || headerDepartment || headerEmail) ? (
              <>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={(event) => setProfileInfoAnchor(event.currentTarget)}
                  endIcon={
                    <ExpandMoreRoundedIcon
                      sx={{
                        transform: profileInfoOpen ? "rotate(180deg)" : "rotate(0deg)",
                        transition: "transform 180ms ease"
                      }}
                    />
                  }
                  sx={{
                    mr: 1.5,
                    textTransform: "none",
                    borderRadius: 2,
                    minWidth: 0,
                    maxWidth: { xs: 330, md: 520 },
                    px: 1,
                    py: 0.35,
                    borderColor: "divider",
                    color: "text.primary"
                  }}
                >
                  <Stack direction="row" spacing={0.9} alignItems="center" sx={{ minWidth: 0 }}>
                    <Avatar
                      src={headerProfileImageUrl}
                      alt={headerEmployeeName || "User"}
                      imgProps={{
                        onError: (event) => {
                          const target = event.currentTarget;
                          if (!target.src.endsWith("/logo.png")) {
                            target.src = "/logo.png";
                          }
                        }
                      }}
                      sx={{ width: 28, height: 28, bgcolor: "action.selected" }}
                    />

                    <Stack spacing={0.15} alignItems="flex-start" sx={{ minWidth: 0 }}>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 700,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        maxWidth: { xs: 180, md: 280 },
                        lineHeight: 1.1
                      }}
                      title={headerEmployeeName}
                    >
                      {headerEmployeeName}
                    </Typography>
                    {headerJobName ? (
                      <Typography
                        variant="caption"
                        sx={{
                          fontWeight: 500,
                          color: "info.light",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          maxWidth: { xs: 180, md: 280 },
                          lineHeight: 1.15
                        }}
                        title={headerJobName}
                      >
                        {headerJobName}
                      </Typography>
                    ) : null}
                  </Stack>
                    </Stack>
                </Button>

                <Menu
                  anchorEl={profileInfoAnchor}
                  open={profileInfoOpen}
                  onClose={() => setProfileInfoAnchor(null)}
                  anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                  transformOrigin={{ vertical: "top", horizontal: "right" }}
                  slotProps={{
                    paper: {
                      sx: {
                        mt: 0.7,
                        minWidth: 280,
                        maxWidth: 420,
                        p: 1.1,
                        border: "1px solid",
                        borderColor: "divider",
                        borderRadius: 2
                      }
                    }
                  }}
                >
                  <Stack spacing={1} sx={{ px: 0.6, py: 0.35 }}>
                    <Stack direction="row" spacing={1.1} alignItems="center">
                      <Avatar
                        src={headerProfileImageUrl}
                        alt={headerEmployeeName || "User"}
                        imgProps={{
                          onError: (event) => {
                            const target = event.currentTarget;
                            if (!target.src.endsWith("/logo.png")) {
                              target.src = "/logo.png";
                            }
                          }
                        }}
                        sx={{ width: 44, height: 44, bgcolor: "action.selected" }}
                      />
                      <Stack sx={{ minWidth: 0 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, lineHeight: 1.15 }} noWrap>
                          {headerEmployeeName || "Unknown User"}
                        </Typography>
                        {headerJobName ? (
                          <Typography variant="caption" color="info.main" noWrap>
                            {headerJobName}
                          </Typography>
                        ) : null}
                      </Stack>
                    </Stack>

                    <Divider />

                    <Stack spacing={0.75}>
                      <Stack direction="row" spacing={0.9} alignItems="flex-start">
                        <PersonRoundedIcon sx={{ fontSize: 17, color: "text.secondary", mt: 0.1 }} />
                        <Stack sx={{ minWidth: 0 }}>
                          <Typography variant="caption" color="text.secondary">Name</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap title={headerEmployeeName}>
                            {headerEmployeeName || "-"}
                          </Typography>
                        </Stack>
                      </Stack>

                      <Stack direction="row" spacing={0.9} alignItems="flex-start">
                        <PersonRoundedIcon sx={{ fontSize: 17, color: "text.secondary", mt: 0.1 }} />
                        <Stack sx={{ minWidth: 0 }}>
                          <Typography variant="caption" color="text.secondary">Arabic Name</Typography>
                          <Typography variant="body2" dir="rtl" noWrap title={headerEmployeeNameAr}>
                            {headerEmployeeNameAr || "-"}
                          </Typography>
                        </Stack>
                      </Stack>

                      <Stack direction="row" spacing={0.9} alignItems="flex-start">
                        <EmailRoundedIcon sx={{ fontSize: 17, color: "text.secondary", mt: 0.1 }} />
                        <Stack sx={{ minWidth: 0 }}>
                          <Typography variant="caption" color="text.secondary">Email</Typography>
                          <Typography variant="body2" noWrap title={headerEmail}>
                            {headerEmail || "-"}
                          </Typography>
                        </Stack>
                      </Stack>

                      <Stack direction="row" spacing={0.9} alignItems="flex-start">
                        <LocalPhoneRoundedIcon sx={{ fontSize: 17, color: "text.secondary", mt: 0.1 }} />
                        <Stack sx={{ minWidth: 0 }}>
                          <Typography variant="caption" color="text.secondary">Phone</Typography>
                          <Typography variant="body2" noWrap title={headerPhone}>
                            {headerPhone || "-"}
                          </Typography>
                        </Stack>
                      </Stack>

                      <Stack direction="row" spacing={0.9} alignItems="flex-start">
                        <WorkOutlineRoundedIcon sx={{ fontSize: 17, color: "text.secondary", mt: 0.1 }} />
                        <Stack sx={{ minWidth: 0 }}>
                          <Typography variant="caption" color="text.secondary">Job</Typography>
                          <Typography variant="body2" noWrap title={headerJobName}>
                            {headerJobName || "-"}
                          </Typography>
                        </Stack>
                      </Stack>

                      <Stack direction="row" spacing={0.9} alignItems="flex-start">
                        <WorkOutlineRoundedIcon sx={{ fontSize: 17, color: "text.secondary", mt: 0.1 }} />
                        <Stack sx={{ minWidth: 0 }}>
                          <Typography variant="caption" color="text.secondary">Level</Typography>
                          <Typography variant="body2" noWrap title={headerLevelName}>
                            {headerLevelName || "-"}
                          </Typography>
                        </Stack>
                      </Stack>

                      <Stack direction="row" spacing={0.9} alignItems="flex-start">
                        <ApartmentRoundedIcon sx={{ fontSize: 17, color: "text.secondary", mt: 0.1 }} />
                        <Stack sx={{ minWidth: 0 }}>
                          <Typography variant="caption" color="text.secondary">Department</Typography>
                          <Typography variant="body2" noWrap title={headerDepartment}>
                            {headerDepartment || "-"}
                          </Typography>
                        </Stack>
                      </Stack>
                    </Stack>
                  </Stack>
                </Menu>
              </>
            ) : null}
            <DashboardThemeToggle />
          </Box>

          <PageContainer
            maxWidth={isFullWidthDataPage ? false : "lg"}
            slots={isHrDataPage ? { header: EmptyPageHeader } : undefined}
            sx={
              isHrDataPage
                ? { pt: 0, pb: 1, "& > .MuiStack-root": { my: 0, gap: 0 } }
                : isDepartmentsPage
                  ? {
                      "& .MuiPageContainer-header": {
                        position: "sticky",
                        top: 0,
                        zIndex: 6,
                        pb: 1,
                        bgcolor: "background.default"
                      }
                    }
                  : undefined
            }
          >
            {children}
          </PageContainer>
        </Box>
      </Box>
    </AppProvider>
  );
};
