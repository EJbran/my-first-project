import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import DarkModeRoundedIcon from "@mui/icons-material/DarkModeRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import LightModeRoundedIcon from "@mui/icons-material/LightModeRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import {
  Avatar,
  Box,
  Collapse,
  Divider,
  Drawer,
  Fade,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Paper,
  Popper,
  Stack,
  Tooltip,
  Typography
} from "@mui/material";
import { useColorScheme } from "@mui/material/styles";
import type { Navigation, NavigationItem, NavigationPageItem } from "@toolpad/core/AppProvider";
import { useEffect, useRef, useState } from "react";
import { useThemeMode } from "../app/themeMode";

export const SIDEBAR_EXPANDED_WIDTH = 252;
export const SIDEBAR_COMPACT_WIDTH = 96;
export const SIDEBAR_HEADER_HEIGHT = 82;
export const SIDEBAR_TRANSITION = "340ms cubic-bezier(0.22, 1, 0.36, 1)";

interface AppSidebarProps {
  navigation: Navigation;
  pathname: string;
  displayName: string;
  roles: string[];
  collapsed: boolean;
  mobileOpen: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  onMobileOpenChange: (open: boolean) => void;
  onNavigate: (path: string) => void;
  onLogout: () => void;
}

interface SidebarPanelProps extends AppSidebarProps {
  mobile?: boolean;
}

interface NavigationItemsProps {
  items: Navigation;
  pathname: string;
  parentPath?: string;
  depth?: number;
  collapsed: boolean;
  openGroups: Record<string, boolean>;
  onGroupToggle: (path: string, open?: boolean) => void;
  onCompactGroupEnter: (path: string, item: NavigationPageItem, anchorEl: HTMLElement) => void;
  onCompactGroupLeave: () => void;
  onCollapsedChange: (collapsed: boolean) => void;
  onNavigate: (path: string) => void;
}

interface CompactFlyoutState {
  path: string;
  item: NavigationPageItem;
  anchorEl: HTMLElement;
}

const getInitials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");

const isPageItem = (item: NavigationItem): item is NavigationPageItem =>
  item.kind === undefined || item.kind === "page";

const getNavigationPath = (segment: string | undefined, parentPath = "") => {
  const normalizedSegment = segment?.replace(/^\/+|\/+$/g, "") ?? "";
  if (!normalizedSegment) return parentPath || "/";
  if (parentPath && !normalizedSegment.includes("/")) return `${parentPath}/${normalizedSegment}`;
  return `/${normalizedSegment}`;
};

const getActiveGroupPaths = (
  items: Navigation,
  pathname: string,
  parentPath = ""
): string[] => {
  const activeGroups: string[] = [];

  items.forEach((item) => {
    if (!isPageItem(item) || !item.children?.length) return;
    const path = getNavigationPath(item.segment, parentPath);
    if (pathname === path || pathname.startsWith(`${path}/`)) activeGroups.push(path);
    activeGroups.push(...getActiveGroupPaths(item.children, pathname, path));
  });

  return activeGroups;
};

interface CompactGroupFlyoutProps {
  flyout: CompactFlyoutState | null;
  pathname: string;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onNavigate: (path: string) => void;
  onClose: () => void;
}

const CompactGroupFlyout = ({
  flyout,
  pathname,
  onMouseEnter,
  onMouseLeave,
  onNavigate,
  onClose
}: CompactGroupFlyoutProps) => (
  <Popper
    open={Boolean(flyout)}
    anchorEl={flyout?.anchorEl}
    placement="right-start"
    transition
    modifiers={[
      { name: "offset", options: { offset: [-6, 12] } },
      { name: "preventOverflow", options: { padding: 12 } },
      { name: "flip", options: { fallbackPlacements: ["right-end", "left-start"] } }
    ]}
    sx={{ zIndex: 1450 }}
  >
    {({ TransitionProps }) => (
      <Fade {...TransitionProps} timeout={150}>
        <Paper
          role="menu"
          aria-label={flyout?.item.title ? `${flyout.item.title} submenu` : "Navigation submenu"}
          elevation={0}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
          onFocusCapture={onMouseEnter}
          onBlurCapture={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) onMouseLeave();
          }}
          sx={{
            position: "relative",
            width: 232,
            p: 1,
            border: "1px solid",
            borderColor: "divider",
            borderRadius: "13px",
            bgcolor: "background.paper",
            boxShadow: (theme) => theme.palette.mode === "dark" ? "0 18px 44px rgba(0, 0, 0, 0.46)" : "0 16px 40px rgba(22, 48, 80, 0.16)",
            "&::before": {
              content: "''",
              position: "absolute",
              top: 23,
              left: -6,
              width: 11,
              height: 11,
              bgcolor: "background.paper",
              borderLeft: "1px solid",
              borderBottom: "1px solid",
              borderColor: "divider",
              transform: "rotate(45deg)"
            }
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1} sx={{ px: 1, py: 0.8 }}>
            <Box
              sx={{
                width: 32,
                height: 32,
                display: "grid",
                placeItems: "center",
                flex: "0 0 auto",
                borderRadius: "9px",
                bgcolor: "action.selected",
                color: "primary.main",
                "& .MuiSvgIcon-root": { fontSize: 19 }
              }}
            >
              {flyout?.item.icon}
            </Box>
            <Typography sx={{ minWidth: 0, color: "text.primary", fontSize: 13.5, fontWeight: 800 }} noWrap>
              {flyout?.item.title}
            </Typography>
          </Stack>

          <Divider sx={{ my: 0.55, borderColor: "divider" }} />

          <Stack spacing={0.35} sx={{ pt: 0.25 }}>
            {(flyout?.item.children ?? []).map((child, index) => {
              if (child.kind === "divider") {
                return <Divider key={`flyout-divider-${index}`} sx={{ my: 0.5, borderColor: "divider" }} />;
              }

              if (child.kind === "header") {
                return (
                  <Typography
                    key={`flyout-header-${child.title}`}
                    sx={{ px: 1, pt: 0.65, pb: 0.25, color: "text.secondary", fontSize: 9.5, fontWeight: 800, letterSpacing: "0.9px" }}
                  >
                    {child.title}
                  </Typography>
                );
              }

              if (!isPageItem(child)) return null;

              const childPath = getNavigationPath(child.segment, flyout?.path ?? "");
              const childActive = pathname === childPath || pathname.startsWith(`${childPath}/`);
              const childTitle = child.title ?? child.segment ?? "Navigation item";

              return (
                <Box
                  key={childPath}
                  component="button"
                  type="button"
                  role="menuitem"
                  aria-current={pathname === childPath ? "page" : undefined}
                  onClick={() => {
                    onNavigate(childPath);
                    onClose();
                  }}
                  sx={{
                    width: "100%",
                    minHeight: 42,
                    px: 1,
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    border: 0,
                    borderRadius: "9px",
                    bgcolor: childActive ? "action.selected" : "transparent",
                    color: childActive ? "primary.main" : "text.secondary",
                    cursor: "pointer",
                    font: "inherit",
                    textAlign: "left",
                    transition: "background-color 150ms ease, color 150ms ease",
                    "&:hover": { bgcolor: childActive ? "action.selected" : "action.hover", color: "primary.main" },
                    "&:focus-visible": { outline: "3px solid rgba(37, 99, 235, 0.2)", outlineOffset: 1 }
                  }}
                >
                  <Box
                    sx={{
                      width: 29,
                      height: 29,
                      display: "grid",
                      placeItems: "center",
                      flex: "0 0 auto",
                      borderRadius: "8px",
                      bgcolor: childActive ? "action.selected" : "action.hover",
                      "& .MuiSvgIcon-root": { fontSize: 18 }
                    }}
                  >
                    {child.icon}
                  </Box>
                  <Typography sx={{ minWidth: 0, flex: 1, color: "inherit", fontSize: 12.5, fontWeight: childActive ? 750 : 600 }} noWrap>
                    {childTitle}
                  </Typography>
                  {child.children?.length ? <ChevronRightRoundedIcon sx={{ fontSize: 17, opacity: 0.65 }} /> : null}
                </Box>
              );
            })}
          </Stack>
        </Paper>
      </Fade>
    )}
  </Popper>
);

const NavigationItems = ({
  items,
  pathname,
  parentPath = "",
  depth = 0,
  collapsed,
  openGroups,
  onGroupToggle,
  onCompactGroupEnter,
  onCompactGroupLeave,
  onCollapsedChange,
  onNavigate
}: NavigationItemsProps) => (
  <>
    {items.map((item, index) => {
      if (item.kind === "divider") {
        return <Divider key={`divider-${index}`} sx={{ mx: collapsed ? 1.7 : 2.25, my: 1.25, borderColor: "divider" }} />;
      }

      if (item.kind === "header") {
        return (
          <Stack
            key={`header-${item.title}`}
            direction="row"
            alignItems="center"
            spacing={1}
            sx={{ px: collapsed ? 1.25 : 2.35, pt: 1.9, pb: 0.8 }}
          >
            <Typography
              sx={{
                color: "text.secondary",
                fontSize: collapsed ? 9 : 10,
                lineHeight: 1,
                fontWeight: 800,
                letterSpacing: collapsed ? "0.8px" : "1.25px",
                whiteSpace: "nowrap"
              }}
            >
              {item.title}
            </Typography>
            <Box sx={{ height: 1, flex: 1, bgcolor: "divider" }} />
          </Stack>
        );
      }

      if (!isPageItem(item)) return null;

      const path = getNavigationPath(item.segment, parentPath);
      const hasChildren = Boolean(item.children?.length);
      const exactActive = pathname === path;
      const descendantActive = hasChildren && pathname.startsWith(`${path}/`);
      const selected = exactActive || descendantActive;
      const groupOpen = Boolean(openGroups[path]);
      const compactRootItem = collapsed && depth === 0;
      const title = item.title ?? item.segment ?? "Navigation item";

      const handleClick = () => {
        if (hasChildren) {
          if (collapsed) {
            onCollapsedChange(false);
            onGroupToggle(path, true);
          } else {
            onGroupToggle(path);
          }
          return;
        }
        onNavigate(path);
      };

      return (
        <Box key={path}>
          <Tooltip title={compactRootItem && !hasChildren ? title : ""} placement="right" arrow>
            <Box
              component="button"
              type="button"
              aria-current={exactActive ? "page" : undefined}
              aria-expanded={hasChildren ? groupOpen : undefined}
              aria-haspopup={compactRootItem && hasChildren ? "menu" : undefined}
              onClick={handleClick}
              onMouseEnter={(event) => {
                if (compactRootItem && hasChildren) onCompactGroupEnter(path, item, event.currentTarget);
              }}
              onMouseLeave={() => {
                if (compactRootItem && hasChildren) onCompactGroupLeave();
              }}
              onFocus={(event) => {
                if (compactRootItem && hasChildren) onCompactGroupEnter(path, item, event.currentTarget);
              }}
              onBlur={() => {
                if (compactRootItem && hasChildren) onCompactGroupLeave();
              }}
              sx={{
                position: "relative",
                width: collapsed ? "calc(100% - 16px)" : depth > 0 ? "calc(100% - 14px)" : "calc(100% - 20px)",
                minHeight: compactRootItem ? 62 : depth > 0 ? 40 : 46,
                mx: collapsed ? 1 : depth > 0 ? 0.9 : 1.25,
                my: depth > 0 ? 0.2 : 0.35,
                px: compactRootItem ? 0.5 : depth > 0 ? 1 : 1.15,
                py: compactRootItem ? 0.65 : 0.45,
                display: "flex",
                flexDirection: compactRootItem ? "column" : "row",
                alignItems: "center",
                justifyContent: compactRootItem ? "center" : "flex-start",
                gap: compactRootItem ? 0.3 : depth > 0 ? 0.8 : 1.05,
                border: 0,
                borderRadius: depth > 0 ? "9px" : "11px",
                bgcolor: selected ? "action.selected" : "transparent",
                color: selected ? "primary.main" : "text.secondary",
                cursor: "pointer",
                font: "inherit",
                textAlign: "left",
                overflow: "hidden",
                transition: `background-color 170ms ease, color 170ms ease, width ${SIDEBAR_TRANSITION}, padding ${SIDEBAR_TRANSITION}`,
                "&::before": exactActive
                  ? {
                      content: "''",
                      position: "absolute",
                      left: 0,
                      top: compactRootItem ? 10 : 9,
                      bottom: compactRootItem ? 10 : 9,
                      width: 3,
                      borderRadius: "0 4px 4px 0",
                      bgcolor: "primary.main"
                    }
                  : undefined,
                "&:hover": {
                  bgcolor: selected ? "action.selected" : "action.hover",
                  color: "primary.main"
                },
                "&:focus-visible": {
                  outline: "3px solid rgba(37, 99, 235, 0.2)",
                  outlineOffset: 1
                }
              }}
            >
              <Box
                sx={{
                  width: compactRootItem ? 30 : depth > 0 ? 28 : 34,
                  height: compactRootItem ? 27 : depth > 0 ? 28 : 34,
                  display: "grid",
                  placeItems: "center",
                  flex: "0 0 auto",
                  borderRadius: "9px",
                  bgcolor: selected ? "action.selected" : depth > 0 ? "transparent" : "action.hover",
                  color: "inherit",
                  transition: "background-color 170ms ease, transform 170ms ease",
                  "& .MuiSvgIcon-root": { fontSize: compactRootItem ? 21 : depth > 0 ? 18 : 20 }
                }}
              >
                {item.icon}
              </Box>

              <Typography
                component="span"
                sx={{
                  minWidth: 0,
                  flex: compactRootItem ? "0 0 auto" : 1,
                  maxWidth: compactRootItem ? "100%" : "none",
                  color: "inherit",
                  fontSize: compactRootItem ? 10.25 : depth > 0 ? 12.5 : 13.25,
                  lineHeight: compactRootItem ? 1.13 : 1.25,
                  fontWeight: selected ? 750 : depth > 0 ? 550 : 650,
                  whiteSpace: "normal",
                  overflow: compactRootItem ? "hidden" : "visible",
                  textOverflow: compactRootItem ? "ellipsis" : "clip",
                  overflowWrap: "anywhere",
                  wordBreak: "break-word",
                  textAlign: compactRootItem ? "center" : "left",
                  display: compactRootItem ? "-webkit-box" : "block",
                  WebkitBoxOrient: compactRootItem ? "vertical" : undefined,
                  WebkitLineClamp: compactRootItem ? 2 : undefined
                }}
              >
                {title}
              </Typography>

              {hasChildren ? (
                <ExpandMoreRoundedIcon
                  sx={{
                    position: compactRootItem ? "absolute" : "static",
                    top: compactRootItem ? 6 : "auto",
                    right: compactRootItem ? 7 : "auto",
                    width: compactRootItem ? 15 : 19,
                    height: compactRootItem ? 15 : 19,
                    flex: "0 0 auto",
                    opacity: 0.75,
                    transform: groupOpen ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 220ms cubic-bezier(0.22, 1, 0.36, 1)"
                  }}
                />
              ) : null}
            </Box>
          </Tooltip>

          {hasChildren && !collapsed ? (
            <Collapse in={groupOpen} timeout={260} unmountOnExit>
              <Box
                sx={{
                  position: "relative",
                  ml: 3.35,
                  pl: 1.1,
                  py: 0.25,
                  "&::before": {
                    content: "''",
                    position: "absolute",
                    left: 0,
                    top: 4,
                    bottom: 4,
                    width: "1px",
                    bgcolor: "divider"
                  }
                }}
              >
                <NavigationItems
                  items={item.children ?? []}
                  pathname={pathname}
                  parentPath={path}
                  depth={depth + 1}
                  collapsed={collapsed}
                  openGroups={openGroups}
                  onGroupToggle={onGroupToggle}
                  onCompactGroupEnter={onCompactGroupEnter}
                  onCompactGroupLeave={onCompactGroupLeave}
                  onCollapsedChange={onCollapsedChange}
                  onNavigate={onNavigate}
                />
              </Box>
            </Collapse>
          ) : null}
        </Box>
      );
    })}
  </>
);

const SidebarPanel = ({
  navigation,
  pathname,
  displayName,
  roles,
  collapsed,
  mobile = false,
  onCollapsedChange,
  onMobileOpenChange,
  onNavigate,
  onLogout
}: SidebarPanelProps) => {
  const compact = collapsed && !mobile;
  const { mode, setMode: setThemeMode } = useThemeMode();
  const { setMode: setColorSchemeMode } = useColorScheme();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [compactFlyout, setCompactFlyout] = useState<CompactFlyoutState | null>(null);
  const [profileMenuAnchor, setProfileMenuAnchor] = useState<HTMLElement | null>(null);
  const flyoutCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const profileMenuOpen = Boolean(profileMenuAnchor);

  const cancelFlyoutClose = () => {
    if (flyoutCloseTimerRef.current) {
      clearTimeout(flyoutCloseTimerRef.current);
      flyoutCloseTimerRef.current = null;
    }
  };

  const closeCompactFlyout = () => {
    cancelFlyoutClose();
    setCompactFlyout(null);
  };

  const scheduleFlyoutClose = () => {
    cancelFlyoutClose();
    flyoutCloseTimerRef.current = setTimeout(() => {
      setCompactFlyout(null);
      flyoutCloseTimerRef.current = null;
    }, 160);
  };

  const handleCompactGroupEnter = (
    path: string,
    item: NavigationPageItem,
    anchorEl: HTMLElement
  ) => {
    cancelFlyoutClose();
    setCompactFlyout({ path, item, anchorEl });
  };

  useEffect(() => {
    const activeGroups = getActiveGroupPaths(navigation, pathname);
    setOpenGroups((current) => {
      let changed = false;
      const next = { ...current };
      activeGroups.forEach((path) => {
        if (!next[path]) {
          next[path] = true;
          changed = true;
        }
      });
      return changed ? next : current;
    });
  }, [navigation, pathname]);

  useEffect(() => {
    if (!compact) setCompactFlyout(null);
  }, [compact]);

  useEffect(
    () => () => {
      if (flyoutCloseTimerRef.current) clearTimeout(flyoutCloseTimerRef.current);
    },
    []
  );

  const handleGroupToggle = (path: string, open?: boolean) => {
    setOpenGroups((current) => ({ ...current, [path]: open ?? !current[path] }));
  };

  const handleToggleMode = () => {
    const nextMode = mode === "dark" ? "light" : "dark";
    setThemeMode(nextMode);
    setColorSchemeMode(nextMode);
    setProfileMenuAnchor(null);
  };

  const handleNavigate = (path: string) => {
    closeCompactFlyout();
    setProfileMenuAnchor(null);
    onNavigate(path);
    if (mobile) onMobileOpenChange(false);
  };

  return (
    <Box
      sx={{
        width: compact ? SIDEBAR_COMPACT_WIDTH : SIDEBAR_EXPANDED_WIDTH,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        bgcolor: "background.paper",
        color: "text.secondary",
        overflow: "hidden",
        transition: `width ${SIDEBAR_TRANSITION}`
      }}
    >
      <Box
        sx={{
          height: SIDEBAR_HEADER_HEIGHT,
          minHeight: SIDEBAR_HEADER_HEIGHT,
          flex: "0 0 auto",
          px: compact ? 1 : 1.75,
          display: "flex",
          alignItems: "center",
          justifyContent: compact ? "center" : "flex-start",
          gap: 1.15,
          borderBottom: "1px solid",
          borderColor: "divider",
          transition: `padding ${SIDEBAR_TRANSITION}`
        }}
      >
        <Box
          sx={{
            width: compact ? 44 : 46,
            height: compact ? 44 : 46,
            borderRadius: "50%",
            flex: "0 0 auto",
            overflow: "hidden",
            bgcolor: "background.paper",
            border: "1px solid",
            borderColor: "divider",
            boxShadow: "0 5px 16px rgba(15, 45, 85, 0.08)",
            transition: `width ${SIDEBAR_TRANSITION}, height ${SIDEBAR_TRANSITION}`
          }}
        >
          <Box component="img" src="/logo.png" alt="IMS" sx={{ width: "100%", height: "100%", objectFit: "cover", transform: "scale(1.5)" }} />
        </Box>

        {!compact ? (
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography sx={{ color: "text.primary", fontSize: 19, lineHeight: 1.1, fontWeight: 800 }}>IMS</Typography>
            <Typography sx={{ color: "text.secondary", fontSize: 11.5, mt: 0.35 }} noWrap>
              Harouge Oil Operations
            </Typography>
          </Box>
        ) : null}

        {mobile ? (
          <IconButton aria-label="Close navigation" onClick={() => onMobileOpenChange(false)} sx={{ color: "text.secondary" }}>
            <CloseRoundedIcon />
          </IconButton>
        ) : null}
      </Box>

      <Box component="nav" aria-label="Main navigation" sx={{ flex: 1, overflowY: "auto", overflowX: "hidden", py: 1.15, scrollbarWidth: "thin" }}>
        <NavigationItems
          items={navigation}
          pathname={pathname}
          collapsed={compact}
          openGroups={openGroups}
          onGroupToggle={handleGroupToggle}
          onCompactGroupEnter={handleCompactGroupEnter}
          onCompactGroupLeave={scheduleFlyoutClose}
          onCollapsedChange={onCollapsedChange}
          onNavigate={handleNavigate}
        />
      </Box>

      <Box sx={{ p: compact ? 1 : 1.5, borderTop: "1px solid", borderColor: "divider", bgcolor: "background.paper", transition: `padding ${SIDEBAR_TRANSITION}` }}>
        <Tooltip title={compact ? "Profile options" : ""} placement="right" arrow>
          <Box
            component="button"
            type="button"
            aria-label="Open profile options"
            aria-haspopup="menu"
            aria-expanded={profileMenuOpen ? "true" : undefined}
            aria-controls={profileMenuOpen ? "sidebar-profile-menu" : undefined}
            onClick={(event) => setProfileMenuAnchor(event.currentTarget)}
            sx={{
              width: "100%",
              minHeight: compact ? 48 : 52,
              p: compact ? 0.45 : 0.65,
              display: "flex",
              alignItems: "center",
              justifyContent: compact ? "center" : "flex-start",
              gap: 1.1,
              border: 0,
              borderRadius: "11px",
              bgcolor: profileMenuOpen ? "action.selected" : "transparent",
              color: "text.secondary",
              cursor: "pointer",
              font: "inherit",
              textAlign: "left",
              transition: "background-color 160ms ease, color 160ms ease",
              "&:hover": { bgcolor: "action.hover", color: "primary.main" },
              "&:focus-visible": { outline: "3px solid rgba(37, 99, 235, 0.2)", outlineOffset: 1 }
            }}
          >
            <Avatar sx={{ width: 40, height: 40, flex: "0 0 auto", bgcolor: "action.selected", color: "primary.main", fontSize: 12.5, fontWeight: 800 }}>
              {getInitials(displayName)}
            </Avatar>
            {!compact ? (
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography sx={{ color: "text.primary", fontSize: 13.25, fontWeight: 750 }} noWrap>{displayName}</Typography>
                <Typography sx={{ color: "text.secondary", fontSize: 11.5 }} noWrap>{roles.join(", ") || "IMS Administrator"}</Typography>
              </Box>
            ) : null}
            {!compact ? (
              <ExpandMoreRoundedIcon
                sx={{
                  width: 19,
                  height: 19,
                  flex: "0 0 auto",
                  color: "text.secondary",
                  transform: profileMenuOpen ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 180ms ease"
                }}
              />
            ) : null}
          </Box>
        </Tooltip>

        <Menu
          id="sidebar-profile-menu"
          anchorEl={profileMenuAnchor}
          open={profileMenuOpen}
          onClose={() => setProfileMenuAnchor(null)}
          anchorOrigin={{ vertical: "top", horizontal: compact ? "right" : "left" }}
          transformOrigin={{ vertical: "bottom", horizontal: "left" }}
          slotProps={{
            paper: {
              sx: {
                width: 220,
                mb: 0.75,
                border: "1px solid",
                borderColor: "divider",
                borderRadius: "12px",
                bgcolor: "background.paper",
                boxShadow: (theme) => theme.palette.mode === "dark" ? "0 18px 42px rgba(0, 0, 0, 0.46)" : "0 16px 38px rgba(22, 48, 80, 0.16)"
              }
            },
            list: { "aria-label": "Profile options", sx: { p: 0.65 } }
          }}
        >
          <MenuItem onClick={handleToggleMode} sx={{ minHeight: 42, px: 1.1, borderRadius: "8px", color: "text.primary" }}>
            <ListItemIcon sx={{ minWidth: 34, color: "primary.main" }}>
              {mode === "dark" ? <LightModeRoundedIcon fontSize="small" /> : <DarkModeRoundedIcon fontSize="small" />}
            </ListItemIcon>
            <ListItemText
              primary={mode === "dark" ? "Light mode" : "Dark mode"}
              primaryTypographyProps={{ fontSize: 13, fontWeight: 650 }}
            />
          </MenuItem>
          <Divider sx={{ my: 0.55, borderColor: "divider" }} />
          <MenuItem
            onClick={() => {
              setProfileMenuAnchor(null);
              onLogout();
            }}
            sx={{ minHeight: 42, px: 1.1, borderRadius: "8px", color: "error.main", "&:hover": { bgcolor: "action.hover" } }}
          >
            <ListItemIcon sx={{ minWidth: 34, color: "inherit" }}>
              <LogoutRoundedIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Sign out" primaryTypographyProps={{ fontSize: 13, fontWeight: 700 }} />
          </MenuItem>
        </Menu>
      </Box>

      <CompactGroupFlyout
        flyout={compactFlyout}
        pathname={pathname}
        onMouseEnter={cancelFlyoutClose}
        onMouseLeave={scheduleFlyoutClose}
        onNavigate={handleNavigate}
        onClose={closeCompactFlyout}
      />
    </Box>
  );
};

export const AppSidebar = (props: AppSidebarProps) => (
  <>
    <Box
      component="aside"
      sx={{
        position: "fixed",
        zIndex: 1200,
        inset: "0 auto 0 0",
        width: props.collapsed ? SIDEBAR_COMPACT_WIDTH : SIDEBAR_EXPANDED_WIDTH,
        display: { xs: "none", md: "block" },
        bgcolor: "background.paper",
        borderRight: "1px solid",
        borderColor: "divider",
        boxShadow: (theme) => theme.palette.mode === "dark" ? "5px 0 24px rgba(0, 0, 0, 0.24)" : "5px 0 24px rgba(21, 47, 78, 0.045)",
        transition: `width ${SIDEBAR_TRANSITION}`
      }}
    >
      <SidebarPanel {...props} />
      <Tooltip title={props.collapsed ? "Expand sidebar" : "Collapse sidebar"} placement="right" arrow>
        <IconButton
          aria-label={props.collapsed ? "Expand sidebar" : "Collapse sidebar"}
          onClick={() => props.onCollapsedChange(!props.collapsed)}
          sx={{
            position: "absolute",
            top: 29,
            right: -15,
            width: 30,
            height: 30,
            color: "primary.main",
            bgcolor: "background.paper",
            border: "1px solid",
            borderColor: "divider",
            boxShadow: "0 4px 12px rgba(28, 54, 86, 0.12)",
            transition: `transform ${SIDEBAR_TRANSITION}, background-color 160ms ease`,
            "&:hover": { bgcolor: "action.hover" }
          }}
        >
          {props.collapsed ? <ChevronRightRoundedIcon fontSize="small" /> : <ChevronLeftRoundedIcon fontSize="small" />}
        </IconButton>
      </Tooltip>
    </Box>

    <IconButton
      aria-label="Open navigation"
      onClick={() => props.onMobileOpenChange(true)}
      sx={{
        position: "fixed",
        zIndex: 1150,
        top: 12,
        left: 12,
        display: { xs: "inline-flex", md: "none" },
        color: "primary.main",
        bgcolor: "background.paper",
        border: "1px solid",
        borderColor: "divider",
        boxShadow: "0 5px 16px rgba(24, 52, 87, 0.12)",
        "&:hover": { bgcolor: "action.hover" }
      }}
    >
      <MenuRoundedIcon />
    </IconButton>

    <Drawer
      anchor="left"
      open={props.mobileOpen}
      onClose={() => props.onMobileOpenChange(false)}
      ModalProps={{ keepMounted: true }}
      sx={{
        display: { xs: "block", md: "none" },
        "& .MuiDrawer-paper": { width: SIDEBAR_EXPANDED_WIDTH, borderRight: 0, bgcolor: "background.paper" }
      }}
    >
      <SidebarPanel {...props} collapsed={false} mobile />
    </Drawer>
  </>
);
