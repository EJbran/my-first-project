import AccountTreeRoundedIcon from "@mui/icons-material/AccountTreeRounded";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import CodeRoundedIcon from "@mui/icons-material/CodeRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import FullscreenExitRoundedIcon from "@mui/icons-material/FullscreenExitRounded";
import FullscreenRoundedIcon from "@mui/icons-material/FullscreenRounded";
import HubRoundedIcon from "@mui/icons-material/HubRounded";
import PictureAsPdfRoundedIcon from "@mui/icons-material/PictureAsPdfRounded";
import PrintRoundedIcon from "@mui/icons-material/PrintRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";
import ZoomInRoundedIcon from "@mui/icons-material/ZoomInRounded";
import ZoomOutRoundedIcon from "@mui/icons-material/ZoomOutRounded";
import {
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { useColorScheme } from "@mui/material/styles";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { PointerEvent as ReactPointerEvent, ReactNode } from "react";
import type { DepartmentEditTarget } from "./DepartmentEditDialog";

export type DepartmentTreeNode = {
  row: DepartmentEditTarget;
  children: DepartmentTreeNode[];
};

type DepartmentHierarchyChartProps = {
  nodes: DepartmentTreeNode[];
  onEdit: (department: DepartmentEditTarget) => void;
  onRefresh?: () => void;
  refreshing?: boolean;
};

type HierarchyPage = {
  id: string;
  label: string;
  nodes: DepartmentTreeNode[];
  rootLevel: number;
  pageType: "overview" | "manager" | "member";
};

type LayoutMode = "horizontal" | "vertical";

type CardPalette = {
  background: string;
  border: string;
  accent: string;
  text: string;
  mutedText: string;
  badgeBackground: string;
};

type HierarchyChrome = {
  shellBg: string;
  shellBorder: string;
  shellShadow: string;
  toolbarBg: string;
  toolbarBorder: string;
  title: string;
  subtitle: string;
  accent: string;
  chipBg: string;
  chipBorder: string;
  chipText: string;
  chipStrongBg: string;
  chipStrongText: string;
  contentBg: string;
  canvasBg: string;
  pageBg: string;
  pageBorder: string;
  pageShadow: string;
  sidebarBg: string;
  sidebarBorder: string;
  sidebarTitle: string;
  sidebarMuted: string;
  sidebarButtonBg: string;
  sidebarButtonHover: string;
  sidebarSelectedBg: string;
  sidebarSelectedHover: string;
  sidebarSelectedText: string;
  sidebarIconBg: string;
  sidebarIconSelectedBg: string;
  sidebarFooterBg: string;
  scrollbarTrack: string;
  scrollbarThumb: string;
  scrollbarThumbHover: string;
  buttonBg: string;
  buttonBorder: string;
  buttonHover: string;
  headerBg: string;
  headerBorder: string;
  footerBg: string;
  footerBorder: string;
  emptyIcon: string;
  emptyText: string;
  connectorDotBorder: string;
};

type HierarchyThemeValue = {
  isDark: boolean;
  chrome: HierarchyChrome;
};

const HierarchyThemeContext = createContext<HierarchyThemeValue | null>(null);

const useHierarchyTheme = (): HierarchyThemeValue => {
  const context = useContext(HierarchyThemeContext);
  if (!context) {
    throw new Error("useHierarchyTheme must be used within HierarchyThemeProvider");
  }
  return context;
};

const lightChrome: HierarchyChrome = {
  shellBg: "#ffffff",
  shellBorder: "#cbd8e5",
  shellShadow: "0 14px 42px rgba(29,53,78,0.10)",
  toolbarBg: "linear-gradient(135deg, #ffffff 0%, #f5f9fd 55%, #edf5fc 100%)",
  toolbarBorder: "#dbe5ef",
  title: "#17324d",
  subtitle: "#6b7f93",
  accent: "#1769aa",
  chipBg: "#ffffff",
  chipBorder: "#ccd9e4",
  chipText: "#47647c",
  chipStrongBg: "#edf4fa",
  chipStrongText: "#24435f",
  contentBg: "#eef3f8",
  canvasBg: "#ffffff",
  pageBg: "#ffffff",
  pageBorder: "#c9d6e2",
  pageShadow: "0 16px 42px rgba(31,50,68,0.14)",
  sidebarBg: "#f8fbfe",
  sidebarBorder: "#d4e0eb",
  sidebarTitle: "#263f57",
  sidebarMuted: "#8192a3",
  sidebarButtonBg: "#eaf1f7",
  sidebarButtonHover: "#dfeaf4",
  sidebarSelectedBg: "#e5f1fb",
  sidebarSelectedHover: "#dcecf9",
  sidebarSelectedText: "#174e7c",
  sidebarIconBg: "#e5edf4",
  sidebarIconSelectedBg: "#1f70ad",
  sidebarFooterBg: "#f2f7fb",
  scrollbarTrack: "#eef3f7",
  scrollbarThumb: "#9fb3c5",
  scrollbarThumbHover: "#7893aa",
  buttonBg: "#ffffff",
  buttonBorder: "#d4d7e8",
  buttonHover: "#f5f1f7",
  headerBg: "#f5f8fc",
  headerBorder: "#dbe4ec",
  footerBg: "#f7f9fb",
  footerBorder: "#e1e8ef",
  emptyIcon: "#9fb0c0",
  emptyText: "#60778c",
  connectorDotBorder: "#ffffff",
};

const darkChrome: HierarchyChrome = {
  shellBg: "#111827",
  shellBorder: "rgba(148, 163, 184, 0.22)",
  shellShadow: "0 14px 42px rgba(0,0,0,0.45)",
  toolbarBg: "linear-gradient(135deg, #151c2c 0%, #121a28 55%, #0f1623 100%)",
  toolbarBorder: "rgba(148, 163, 184, 0.18)",
  title: "#e8eef7",
  subtitle: "#94a3b8",
  accent: "#3b82f6",
  chipBg: "#1a2333",
  chipBorder: "rgba(148, 163, 184, 0.28)",
  chipText: "#cbd5e1",
  chipStrongBg: "#1e293b",
  chipStrongText: "#bfdbfe",
  contentBg: "#0b1220",
  canvasBg: "#0f1623",
  pageBg: "#151c2c",
  pageBorder: "rgba(148, 163, 184, 0.22)",
  pageShadow: "0 16px 42px rgba(0,0,0,0.42)",
  sidebarBg: "#121a28",
  sidebarBorder: "rgba(148, 163, 184, 0.18)",
  sidebarTitle: "#e2e8f0",
  sidebarMuted: "#94a3b8",
  sidebarButtonBg: "#1e293b",
  sidebarButtonHover: "#273449",
  sidebarSelectedBg: "#1e3a5f",
  sidebarSelectedHover: "#24486f",
  sidebarSelectedText: "#93c5fd",
  sidebarIconBg: "#1e293b",
  sidebarIconSelectedBg: "#2563eb",
  sidebarFooterBg: "#0f1623",
  scrollbarTrack: "#121a28",
  scrollbarThumb: "#475569",
  scrollbarThumbHover: "#64748b",
  buttonBg: "#1a2333",
  buttonBorder: "rgba(148, 163, 184, 0.28)",
  buttonHover: "#243044",
  headerBg: "#1a2333",
  headerBorder: "rgba(148, 163, 184, 0.18)",
  footerBg: "#121a28",
  footerBorder: "rgba(148, 163, 184, 0.16)",
  emptyIcon: "#64748b",
  emptyText: "#94a3b8",
  connectorDotBorder: "#151c2c",
};

const SIDEBAR_EXPANDED_WIDTH = 248;
const SIDEBAR_COLLAPSED_WIDTH = 64;
const MIN_ZOOM = 0.4;
const MAX_ZOOM = 1.8;
const ZOOM_STEP = 0.1;

const A3_WIDTH = 1587;
const A3_HEIGHT = 1123;
const DETAIL_COLUMN_WIDTH = 248;
const DETAIL_COLUMN_GAP = 72;
const DETAIL_CARD_HEIGHT = 78;
const DETAIL_VERTICAL_GAP = 44;
const DETAIL_LIST_TOP_GAP = 36;
const DETAIL_CONNECTOR_COLOR = "#2f2a5a";
const DETAIL_CONNECTOR_WIDTH = "3px";
const DETAIL_CONNECTOR_DOT_SIZE = 8;

const OVERVIEW_GROUP_WIDTH = 226;
const OVERVIEW_GROUP_GAP = 24;
const OVERVIEW_CONNECTOR_COLOR = "#2f2a5a";
const OVERVIEW_CONNECTOR_WIDTH = "2px";
const OVERVIEW_CONNECTOR_DOT_SIZE = 8;

const overviewDepartmentTypes = [
  "Manager",
  "Member",
  "Top management",
];

const detailDepartmentTypes = [
  "Manager",
  "Division",
  "Coordinator",
  "Section",
  "Unit",
];

const memberDetailDepartmentTypes = [
  "Member",
  "Manager",
  "Division",
  "Coordinator",
  "Section",
  "Unit",
];

const overviewColors: Record<string, CardPalette> = {
  "top management": {
    background: "#fffafa",
    border: "#c83235",
    accent: "#c83235",
    text: "#2f2a5a",
    mutedText: "#5d587e",
    badgeBackground: "#fdebec",
  },
  manager: {
    background: "#f3f4fb",
    border: "#4d538d",
    accent: "#c83235",
    text: "#2f2a5a",
    mutedText: "#5f6689",
    badgeBackground: "#e6e9f7",
  },
  member: {
    background: "#2f2a5a",
    border: "#2f2a5a",
    accent: "#c83235",
    text: "#ffffff",
    mutedText: "#dddaf1",
    badgeBackground: "#474271",
  },
};

const detailColors: Record<string, CardPalette> = {
  manager: {
    background: "#f5f6fb",
    border: "#4d538d",
    accent: "#c83235",
    text: "#2f2a5a",
    mutedText: "#5e6485",
    badgeBackground: "#e7e9f6",
  },
  member: {
    background: "#2f2a5a",
    border: "#2f2a5a",
    accent: "#c83235",
    text: "#ffffff",
    mutedText: "#dddaf1",
    badgeBackground: "#474271",
  },
  division: {
    background: "#ffffff",
    border: "#5b6299",
    accent: "#2f2a5a",
    text: "#2f2a5a",
    mutedText: "#5a617f",
    badgeBackground: "#eceef8",
  },
  coordinator: {
    background: "#fff6f6",
    border: "#c57a7f",
    accent: "#c83235",
    text: "#642f34",
    mutedText: "#7d565a",
    badgeBackground: "#fde8e9",
  },
  section: {
    background: "#fbfbfe",
    border: "#8b90b6",
    accent: "#6d73a5",
    text: "#373d69",
    mutedText: "#656b8b",
    badgeBackground: "#edeff8",
  },
  unit: {
    background: "#f7f8fc",
    border: "#7d87b0",
    accent: "#4d538d",
    text: "#32406b",
    mutedText: "#5c6787",
    badgeBackground: "#eaedf7",
  },
};

const defaultDetailPalette: CardPalette = {
  background: "#fafbfe",
  border: "#8a90b3",
  accent: "#4d538d",
  text: "#33415f",
  mutedText: "#5f6b84",
  badgeBackground: "#eceff7",
};

const overviewColorsDark: Record<string, CardPalette> = {
  "top management": {
    background: "#2a1520",
    border: "#ef4444",
    accent: "#f87171",
    text: "#fee2e2",
    mutedText: "#fca5a5",
    badgeBackground: "#3f1d2a",
  },
  manager: {
    background: "#1e2440",
    border: "#818cf8",
    accent: "#f87171",
    text: "#e0e7ff",
    mutedText: "#a5b4fc",
    badgeBackground: "#2a3158",
  },
  member: {
    background: "#312e81",
    border: "#6366f1",
    accent: "#f87171",
    text: "#ffffff",
    mutedText: "#c7d2fe",
    badgeBackground: "#4338ca",
  },
};

const detailColorsDark: Record<string, CardPalette> = {
  manager: {
    background: "#1e2440",
    border: "#818cf8",
    accent: "#f87171",
    text: "#e0e7ff",
    mutedText: "#a5b4fc",
    badgeBackground: "#2a3158",
  },
  member: {
    background: "#312e81",
    border: "#6366f1",
    accent: "#f87171",
    text: "#ffffff",
    mutedText: "#c7d2fe",
    badgeBackground: "#4338ca",
  },
  division: {
    background: "#1a2333",
    border: "#64748b",
    accent: "#93c5fd",
    text: "#e2e8f0",
    mutedText: "#94a3b8",
    badgeBackground: "#243044",
  },
  coordinator: {
    background: "#2a181c",
    border: "#fb7185",
    accent: "#f87171",
    text: "#fecdd3",
    mutedText: "#fda4af",
    badgeBackground: "#3f1d24",
  },
  section: {
    background: "#1c2236",
    border: "#7c8bb5",
    accent: "#a5b4fc",
    text: "#e2e8f0",
    mutedText: "#94a3b8",
    badgeBackground: "#252d45",
  },
  unit: {
    background: "#1a2235",
    border: "#6b7aa6",
    accent: "#93c5fd",
    text: "#e2e8f0",
    mutedText: "#94a3b8",
    badgeBackground: "#243044",
  },
};

const defaultDetailPaletteDark: CardPalette = {
  background: "#1a2333",
  border: "#64748b",
  accent: "#93c5fd",
  text: "#e2e8f0",
  mutedText: "#94a3b8",
  badgeBackground: "#243044",
};

const normalizeDepartmentType = (value: string | undefined): string =>
  value?.trim().toLowerCase() ?? "";

const isDepartmentType = (
  node: DepartmentTreeNode,
  type: string,
): boolean => normalizeDepartmentType(node.row.departmentType) === type;

const getOverviewPalette = (
  departmentType: string | undefined,
  isDark = false,
): CardPalette =>
  (isDark ? overviewColorsDark : overviewColors)[
    normalizeDepartmentType(departmentType)
  ] ?? (isDark ? defaultDetailPaletteDark : defaultDetailPalette);

const getDetailPalette = (
  departmentType: string | undefined,
  isDark = false,
): CardPalette =>
  (isDark ? detailColorsDark : detailColors)[
    normalizeDepartmentType(departmentType)
  ] ?? (isDark ? defaultDetailPaletteDark : defaultDetailPalette);

const trimTreeToMaxLevel = (
  nodes: DepartmentTreeNode[],
  maxLevel: number,
  currentLevel = 0,
): DepartmentTreeNode[] =>
  nodes.map((node) => ({
    row: node.row,
    children:
      currentLevel < maxLevel
        ? trimTreeToMaxLevel(node.children, maxLevel, currentLevel + 1)
        : [],
  }));

const filterTreeByDepartmentTypes = (
  nodes: DepartmentTreeNode[],
  allowedTypes: string[],
): DepartmentTreeNode[] => {
  const allowedSet = new Set(
    allowedTypes.map((type) => type.trim().toLowerCase()),
  );

  return nodes.reduce<DepartmentTreeNode[]>((result, node) => {
    const filteredChildren = filterTreeByDepartmentTypes(
      node.children,
      allowedTypes,
    );

    const nodeAllowed = allowedSet.has(
      normalizeDepartmentType(node.row.departmentType),
    );

    if (nodeAllowed || filteredChildren.length > 0) {
      result.push({
        row: node.row,
        children: filteredChildren,
      });
    }

    return result;
  }, []);
};

const countTreeNodes = (nodes: DepartmentTreeNode[]): number =>
  nodes.reduce(
    (total, node) => total + 1 + countTreeNodes(node.children),
    0,
  );

const hasDepartmentTypeInBranch = (
  node: DepartmentTreeNode,
  departmentType: string,
): boolean => {
  const normalizedType = departmentType.trim().toLowerCase();

  return node.children.some(
    (child) =>
      isDepartmentType(child, normalizedType) ||
      hasDepartmentTypeInBranch(child, normalizedType),
  );
};

const splitDivisionsByCoordinator = (divisions: DepartmentTreeNode[]) => ({
  withCoordinators: divisions.filter((division) =>
    hasDepartmentTypeInBranch(division, "coordinator"),
  ),
  withoutCoordinators: divisions.filter(
    (division) => !hasDepartmentTypeInBranch(division, "coordinator"),
  ),
});

const getReportToId = (node: DepartmentTreeNode): number => {
  const parentId = Number(node.row.attachedNumber);
  return Number.isFinite(parentId) ? parentId : 0;
};

const compareByReportTo = (
  first: DepartmentTreeNode,
  second: DepartmentTreeNode,
): number => {
  const reportToDiff = getReportToId(first) - getReportToId(second);
  if (reportToDiff !== 0) {
    return reportToDiff;
  }

  return Number(first.row.id) - Number(second.row.id);
};

const collectNodesByType = (
  nodes: DepartmentTreeNode[],
  departmentType: "member" | "manager",
): DepartmentTreeNode[] => {
  const collected: DepartmentTreeNode[] = [];
  const seenIds = new Set<string | number>();

  const visit = (items: DepartmentTreeNode[]) => {
    [...items].sort(compareByReportTo).forEach((item) => {
      if (
        isDepartmentType(item, departmentType) &&
        !seenIds.has(item.row.id)
      ) {
        seenIds.add(item.row.id);
        collected.push(item);
      }

      visit(item.children);
    });
  };

  visit(nodes);
  return collected.sort(compareByReportTo);
};

/**
 * Sidebar order follows org levels:
 * Top management (Overview) → Members → Managers,
 * and within each group sort by Report To from 0 upward.
 */
const collectDetailPageNodes = (
  nodes: DepartmentTreeNode[],
): Array<{ node: DepartmentTreeNode; pageType: "member" | "manager" }> => [
  ...collectNodesByType(nodes, "member").map((node) => ({
    node,
    pageType: "member" as const,
  })),
  ...collectNodesByType(nodes, "manager").map((node) => ({
    node,
    pageType: "manager" as const,
  })),
];

/**
 * Manager pages are visual pages only. Every Division is promoted to the
 * horizontal Division rail immediately below its Manager. Non-Division nodes
 * remain under the closest Division in which they were found. Nodes that do
 * not belong to a Division stay as direct reports of the Manager.
 */
const normalizeManagerTree = (
  manager: DepartmentTreeNode,
): DepartmentTreeNode => {
  const divisions: DepartmentTreeNode[] = [];
  const directReports: DepartmentTreeNode[] = [];

  const rebuild = (
    sourceChildren: DepartmentTreeNode[],
    destination: DepartmentTreeNode[],
  ) => {
    sourceChildren.forEach((sourceChild) => {
      const rebuiltChild: DepartmentTreeNode = {
        row: sourceChild.row,
        children: [],
      };

      if (isDepartmentType(sourceChild, "division")) {
        divisions.push(rebuiltChild);
        rebuild(sourceChild.children, rebuiltChild.children);
        return;
      }

      destination.push(rebuiltChild);
      rebuild(sourceChild.children, rebuiltChild.children);
    });
  };

  rebuild(manager.children, directReports);

  return {
    row: manager.row,
    children: [...divisions, ...directReports],
  };
};

/**
 * Member pages show only departments that report directly to the Member.
 * Managers appear as leaf "sub manager" cards (they keep their own pages).
 * Divisions, Coordinators, Sections, and Units keep their own subtrees.
 */
const normalizeMemberTree = (
  member: DepartmentTreeNode,
): DepartmentTreeNode => ({
  row: member.row,
  children: member.children.map((child) => {
    if (isDepartmentType(child, "manager")) {
      return {
        row: child.row,
        children: [],
      };
    }

    return {
      row: child.row,
      children: child.children,
    };
  }),
});

const splitMemberDirectReports = (memberNode: DepartmentTreeNode) => {
  const divisions = memberNode.children.filter((node) =>
    isDepartmentType(node, "division"),
  );
  const coordinators = memberNode.children.filter((node) =>
    isDepartmentType(node, "coordinator"),
  );
  const managers = memberNode.children.filter((node) =>
    isDepartmentType(node, "manager"),
  );
  const otherDirectReports = memberNode.children.filter(
    (node) =>
      !isDepartmentType(node, "division") &&
      !isDepartmentType(node, "coordinator") &&
      !isDepartmentType(node, "manager"),
  );
  const { withCoordinators, withoutCoordinators } =
    splitDivisionsByCoordinator(divisions);

  return {
    divisions,
    coordinators,
    managers,
    otherDirectReports,
    withCoordinators,
    withoutCoordinators,
  };
};

const getDepartmentName = (department: DepartmentEditTarget): string =>
  department.departmentNameEnglish?.trim() ||
  department.departmentNameArabic?.trim() ||
  `Department ${department.id}`;

const sanitizeFileName = (value: string): string =>
  value
    .trim()
    .replace(/[^a-zA-Z0-9-_ ]+/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-") || "department-hierarchy";

const escapeHtmlAttribute = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const getExportRoot = (): HTMLElement | null =>
  document.querySelector<HTMLElement>(
    '[data-hierarchy-export-root="true"]',
  );

const createStandaloneHtml = (
  root: HTMLElement,
  title: string,
): string => {
  const styles = Array.from(
    document.querySelectorAll<HTMLStyleElement | HTMLLinkElement>(
      'style, link[rel="stylesheet"]',
    ),
  )
    .map((node) => node.outerHTML)
    .join("\n");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <base href="${escapeHtmlAttribute(document.baseURI)}" />
  <title>${escapeHtmlAttribute(title)}</title>
  ${styles}
  <style>
    @page {
      size: 420mm 297mm;
      margin: 0;
    }

    * {
      box-sizing: border-box;
    }

    html,
    body {
      width: 420mm;
      height: 297mm;
      margin: 0;
      padding: 0;
      overflow: hidden !important;
      background: #ffffff !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    body {
      font-family: Inter, "Segoe UI", Arial, sans-serif;
    }

    .hierarchy-print-page {
      width: 420mm;
      height: 297mm;
      padding: 6mm;
      overflow: hidden;
      display: flex;
      justify-content: center;
      align-items: flex-start;
      background: #ffffff !important;
      break-after: avoid;
      break-before: avoid;
      break-inside: avoid;
      page-break-after: avoid;
      page-break-before: avoid;
      page-break-inside: avoid;
    }

    .hierarchy-export-shell {
      width: max-content;
      height: max-content;
      min-width: 0;
      min-height: 0;
      display: flex;
      justify-content: center;
      align-items: flex-start;
      transform-origin: top center;
      background: #ffffff !important;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    [data-hierarchy-export-root="true"] {
      width: max-content !important;
      min-width: 0 !important;
      max-width: none !important;
      margin: 0 auto !important;
      overflow: visible !important;
      box-shadow: none !important;
      transform: none !important;
      transform-origin: top center !important;
      break-inside: avoid !important;
      page-break-inside: avoid !important;
    }

    [data-export-hide="true"] {
      display: none !important;
    }

    @media print {
      html,
      body,
      .hierarchy-print-page {
        width: 420mm !important;
        height: 297mm !important;
        min-width: 420mm !important;
        min-height: 297mm !important;
        max-width: 420mm !important;
        max-height: 297mm !important;
        overflow: hidden !important;
      }
    }
  </style>
</head>
<body>
  <div class="hierarchy-print-page">
    <div class="hierarchy-export-shell">${root.outerHTML}</div>
  </div>

  <script>
    window.fitHierarchyForPrint = async function fitHierarchyForPrint() {
      if (document.fonts && document.fonts.ready) {
        try {
          await document.fonts.ready;
        } catch (_) {
          // Continue with available fonts.
        }
      }

      const page = document.querySelector('.hierarchy-print-page');
      const shell = document.querySelector('.hierarchy-export-shell');
      const exportRoot = document.querySelector(
        '[data-hierarchy-export-root="true"]',
      );

      if (!page || !shell || !exportRoot) {
        return 1;
      }

      exportRoot.style.zoom = '1';
      exportRoot.style.width = 'max-content';
      exportRoot.style.minWidth = '0';
      exportRoot.style.maxWidth = 'none';
      exportRoot.style.height = 'max-content';
      exportRoot.style.maxHeight = 'none';

      shell.style.width = 'max-content';
      shell.style.height = 'max-content';

      await new Promise((resolve) => requestAnimationFrame(resolve));
      await new Promise((resolve) => requestAnimationFrame(resolve));

      const rootRect = exportRoot.getBoundingClientRect();
      const naturalWidth = Math.max(
        exportRoot.scrollWidth,
        exportRoot.offsetWidth,
        rootRect.width,
        1,
      );
      const naturalHeight = Math.max(
        exportRoot.scrollHeight,
        exportRoot.offsetHeight,
        rootRect.height,
        1,
      );

      const availableWidth = Math.max(page.clientWidth, 1);
      const availableHeight = Math.max(page.clientHeight, 1);
      const scale = Math.min(
        1,
        availableWidth / naturalWidth,
        availableHeight / naturalHeight,
      );
      const safeScale = Math.max(0.2, Math.floor(scale * 1000) / 1000);

      exportRoot.style.zoom = String(safeScale);
      shell.style.width = Math.ceil(naturalWidth * safeScale) + 'px';
      shell.style.height = Math.ceil(naturalHeight * safeScale) + 'px';

      return safeScale;
    };

    window.addEventListener('load', () => {
      window.fitHierarchyForPrint();
    });

    window.addEventListener('beforeprint', () => {
      window.fitHierarchyForPrint();
    });
  </script>
</body>
</html>`;
};

type PrintableWindow = Window & {
  fitHierarchyForPrint?: () => Promise<number> | number;
};

const openPrintWindow = (root: HTMLElement, title: string): void => {
  const printWindow = window.open(
    "",
    "_blank",
    "width=1500,height=950,noopener=no,noreferrer=no",
  ) as PrintableWindow | null;

  if (!printWindow) {
    window.alert("Please allow pop-ups to print or export this hierarchy.");
    return;
  }

  printWindow.document.open();
  printWindow.document.write(createStandaloneHtml(root, title));
  printWindow.document.close();

  const printDocument = async () => {
    printWindow.focus();

    try {
      await printWindow.document.fonts?.ready;
    } catch {
      // Continue with available fonts.
    }

    await new Promise<void>((resolve) =>
      printWindow.requestAnimationFrame(() => resolve()),
    );
    await new Promise<void>((resolve) =>
      printWindow.requestAnimationFrame(() => resolve()),
    );

    await printWindow.fitHierarchyForPrint?.();

    printWindow.setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 250);
  };

  if (printWindow.document.readyState === "complete") {
    void printDocument();
  } else {
    printWindow.addEventListener(
      "load",
      () => {
        void printDocument();
      },
      { once: true },
    );
  }
};

const downloadHtml = (root: HTMLElement, title: string): void => {
  const html = createStandaloneHtml(root, title);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = `${sanitizeFileName(title)}.html`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const getVerticalBranchHeight = (nodes: DepartmentTreeNode[]): number => {
  if (nodes.length === 0) {
    return 0;
  }

  return nodes.reduce((total, node) => {
    const ownHeight = DETAIL_CARD_HEIGHT + DETAIL_VERTICAL_GAP;
    const childrenHeight = getVerticalBranchHeight(node.children);
    return total + ownHeight + childrenHeight;
  }, 0);
};

const createManagerPageFit = (
  managerNode: DepartmentTreeNode,
): {
  scale: number;
  columns: number;
  naturalWidth: number;
  naturalHeight: number;
} => {
  const divisions = managerNode.children.filter((node) =>
    isDepartmentType(node, "division"),
  );
  const directReports = managerNode.children.filter(
    (node) => !isDepartmentType(node, "division"),
  );
  const { withCoordinators, withoutCoordinators } =
    splitDivisionsByCoordinator(divisions);

  const columns = Math.max(
    1,
    withCoordinators.length +
      (withoutCoordinators.length > 0 ? 1 : 0) +
      (directReports.length > 0 ? 1 : 0),
  );

  const naturalWidth =
    columns * DETAIL_COLUMN_WIDTH +
    Math.max(0, columns - 1) * DETAIL_COLUMN_GAP +
    112;

  const columnHeights = withCoordinators.map(
    (division) =>
      DETAIL_CARD_HEIGHT + DETAIL_LIST_TOP_GAP + getVerticalBranchHeight(division.children),
  );

  if (withoutCoordinators.length > 0) {
    columnHeights.push(
      DETAIL_CARD_HEIGHT +
        DETAIL_LIST_TOP_GAP +
        getVerticalBranchHeight(withoutCoordinators),
    );
  }

  if (directReports.length > 0) {
    columnHeights.push(
      DETAIL_CARD_HEIGHT + DETAIL_LIST_TOP_GAP + getVerticalBranchHeight(directReports),
    );
  }

  const naturalHeight =
    150 + Math.max(220, ...columnHeights, DETAIL_CARD_HEIGHT);

  const availableWidth = A3_WIDTH - 104;
  const availableHeight = A3_HEIGHT - 176;
  const fitScale = Math.min(
    1,
    availableWidth / Math.max(1, naturalWidth),
    availableHeight / Math.max(1, naturalHeight),
  );

  return {
    scale: Math.max(0.5, Number(fitScale.toFixed(2))),
    columns,
    naturalWidth,
    naturalHeight,
  };
};

const createMemberPageFit = (
  memberNode: DepartmentTreeNode,
): {
  scale: number;
  columns: number;
  naturalWidth: number;
  naturalHeight: number;
} => {
  const {
    coordinators,
    managers,
    otherDirectReports,
    withCoordinators,
    withoutCoordinators,
  } = splitMemberDirectReports(memberNode);

  const columns = Math.max(
    1,
    withCoordinators.length +
      (withoutCoordinators.length > 0 ? 1 : 0) +
      coordinators.length +
      managers.length +
      (otherDirectReports.length > 0 ? 1 : 0),
  );

  const naturalWidth =
    columns * DETAIL_COLUMN_WIDTH +
    Math.max(0, columns - 1) * DETAIL_COLUMN_GAP +
    112;

  const columnHeights = withCoordinators.map(
    (division) =>
      DETAIL_CARD_HEIGHT + DETAIL_LIST_TOP_GAP + getVerticalBranchHeight(division.children),
  );

  if (withoutCoordinators.length > 0) {
    columnHeights.push(
      DETAIL_CARD_HEIGHT +
        DETAIL_LIST_TOP_GAP +
        getVerticalBranchHeight(withoutCoordinators),
    );
  }

  coordinators.forEach((coordinator) => {
    columnHeights.push(
      DETAIL_CARD_HEIGHT + DETAIL_LIST_TOP_GAP + getVerticalBranchHeight(coordinator.children),
    );
  });

  managers.forEach(() => {
    columnHeights.push(DETAIL_CARD_HEIGHT);
  });

  if (otherDirectReports.length > 0) {
    columnHeights.push(
      DETAIL_CARD_HEIGHT + DETAIL_LIST_TOP_GAP + getVerticalBranchHeight(otherDirectReports),
    );
  }

  const naturalHeight =
    150 + Math.max(220, ...columnHeights, DETAIL_CARD_HEIGHT);

  const availableWidth = A3_WIDTH - 104;
  const availableHeight = A3_HEIGHT - 176;
  const fitScale = Math.min(
    1,
    availableWidth / Math.max(1, naturalWidth),
    availableHeight / Math.max(1, naturalHeight),
  );

  return {
    scale: Math.max(0.5, Number(fitScale.toFixed(2))),
    columns,
    naturalWidth,
    naturalHeight,
  };
};

export function DepartmentHierarchyChart({
  nodes,
  onEdit,
  onRefresh,
  refreshing = false,
}: DepartmentHierarchyChartProps) {
  const { mode, systemMode } = useColorScheme();
  const isDark = (mode === "system" ? systemMode : mode) === "dark";
  const themeValue = useMemo<HierarchyThemeValue>(
    () => ({
      isDark,
      chrome: isDark ? darkChrome : lightChrome,
    }),
    [isDark],
  );
  const { chrome } = themeValue;

  const [zoom, setZoom] = useState(1);
  const [activePageId, setActivePageId] = useState("overview");
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [isPanning, setIsPanning] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const chartShellRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const panStartRef = useRef({
    pointerId: -1,
    x: 0,
    y: 0,
    scrollLeft: 0,
    scrollTop: 0,
  });

  useEffect(() => {
    const handleFullscreenChange = () => {
      const activeElement = document.fullscreenElement;
      setIsFullscreen(Boolean(activeElement && activeElement === chartShellRef.current));
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const toggleFullscreen = async () => {
    const shell = chartShellRef.current;
    if (!shell) {
      return;
    }

    try {
      if (!document.fullscreenElement) {
        await shell.requestFullscreen();
        return;
      }

      if (document.fullscreenElement === shell) {
        await document.exitFullscreen();
      }
    } catch {
      window.alert("Fullscreen is not available in this browser.");
    }
  };

  const pages = useMemo<HierarchyPage[]>(() => {
    const overviewNodes = filterTreeByDepartmentTypes(
      trimTreeToMaxLevel(nodes, 2),
      overviewDepartmentTypes,
    );

    const detailPages = collectDetailPageNodes(nodes).map(({ node, pageType }) => {
      if (pageType === "member") {
        const filteredMember = filterTreeByDepartmentTypes(
          [node],
          memberDetailDepartmentTypes,
        )[0];

        const normalizedMember = filteredMember
          ? normalizeMemberTree(filteredMember)
          : {
              row: node.row,
              children: [],
            };

        return {
          id: `member-${node.row.id}`,
          label: getDepartmentName(node.row),
          nodes: [normalizedMember],
          rootLevel: 0,
          pageType: "member" as const,
        };
      }

      const filteredManager = filterTreeByDepartmentTypes(
        [node],
        detailDepartmentTypes,
      )[0];

      const normalizedManager = filteredManager
        ? normalizeManagerTree(filteredManager)
        : {
            row: node.row,
            children: [],
          };

      return {
        id: `manager-${node.row.id}`,
        label: getDepartmentName(node.row),
        nodes: [normalizedManager],
        rootLevel: 0,
        pageType: "manager" as const,
      };
    });

    return [
      {
        id: "overview",
        label: "Organization Overview",
        nodes: overviewNodes,
        rootLevel: 0,
        pageType: "overview",
      },
      ...detailPages,
    ];
  }, [nodes]);

  useEffect(() => {
    if (!pages.some((page) => page.id === activePageId)) {
      setActivePageId("overview");
    }
  }, [activePageId, pages]);

  const activePage =
    pages.find((page) => page.id === activePageId) ?? pages[0];

  const activeNodeCount = countTreeNodes(activePage?.nodes ?? []);
  const sidebarWidth = sidebarExpanded
    ? SIDEBAR_EXPANDED_WIDTH
    : SIDEBAR_COLLAPSED_WIDTH;

  const zoomIn = () =>
    setZoom((current) =>
      Math.min(Number((current + ZOOM_STEP).toFixed(1)), MAX_ZOOM),
    );

  const zoomOut = () =>
    setZoom((current) =>
      Math.max(Number((current - ZOOM_STEP).toFixed(1)), MIN_ZOOM),
    );

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    const target = event.target as HTMLElement;
    const shouldIgnore = target.closest(
      'button, a, input, textarea, select, [role="button"], [data-pan-ignore="true"]',
    );

    if (shouldIgnore || !canvasRef.current) {
      return;
    }

    panStartRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      scrollLeft: canvasRef.current.scrollLeft,
      scrollTop: canvasRef.current.scrollTop,
    };

    canvasRef.current.setPointerCapture(event.pointerId);
    setIsPanning(true);
    event.preventDefault();
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (
      !isPanning ||
      !canvasRef.current ||
      panStartRef.current.pointerId !== event.pointerId
    ) {
      return;
    }

    canvasRef.current.scrollLeft =
      panStartRef.current.scrollLeft - (event.clientX - panStartRef.current.x);
    canvasRef.current.scrollTop =
      panStartRef.current.scrollTop - (event.clientY - panStartRef.current.y);
    event.preventDefault();
  };

  const stopPanning = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!canvasRef.current || panStartRef.current.pointerId !== event.pointerId) {
      return;
    }

    if (canvasRef.current.hasPointerCapture(event.pointerId)) {
      canvasRef.current.releasePointerCapture(event.pointerId);
    }

    panStartRef.current.pointerId = -1;
    setIsPanning(false);
  };

  const handlePrint = () => {
    const root = getExportRoot();
    if (root) {
      openPrintWindow(root, `${activePage.label} - Print`);
    }
  };

  const handleExportPdf = () => {
    const root = getExportRoot();
    if (root) {
      openPrintWindow(root, `${activePage.label} - PDF`);
    }
  };

  const handleExportHtml = () => {
    const root = getExportRoot();
    if (root) {
      downloadHtml(root, activePage.label);
    }
  };

  return (
    <HierarchyThemeContext.Provider value={themeValue}>
      <Paper
        ref={chartShellRef}
        elevation={0}
        sx={{
          height: isFullscreen ? "100vh" : "calc(100vh - 180px)",
          minHeight: isFullscreen ? "100vh" : 620,
          width: isFullscreen ? "100vw" : "auto",
          overflow: "hidden",
          border: isFullscreen ? "none" : `1px solid ${chrome.shellBorder}`,
          borderRadius: isFullscreen ? 0 : 3,
          bgcolor: chrome.shellBg,
          boxShadow: isFullscreen ? "none" : chrome.shellShadow,
          color: chrome.title,
          transition: "background-color 160ms ease, border-color 160ms ease",
        }}
      >
        <HierarchyToolbar
          pageLabel={activePage?.label ?? "No page"}
          nodeCount={activeNodeCount}
          zoom={zoom}
          isFullscreen={isFullscreen}
          refreshing={refreshing}
          onRefresh={onRefresh}
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          onResetZoom={() => setZoom(1)}
          onToggleFullscreen={() => void toggleFullscreen()}
          onPrint={handlePrint}
          onExportPdf={handleExportPdf}
          onExportHtml={handleExportHtml}
        />

        <Box
          sx={{
            height: "calc(100% - 68px)",
            minHeight: 0,
            display: "flex",
            overflow: "hidden",
            bgcolor: chrome.contentBg,
          }}
        >
          <HierarchySidebar
            pages={pages}
            activePageId={activePage.id}
            expanded={sidebarExpanded}
            width={sidebarWidth}
            onToggle={() => setSidebarExpanded((current) => !current)}
            onSelect={setActivePageId}
          />

          <Box
            ref={canvasRef}
            component="main"
            role="region"
            aria-label="Department hierarchy canvas. Drag to move or use the scrollbars."
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={stopPanning}
            onPointerCancel={stopPanning}
            onDragStart={(event) => event.preventDefault()}
            sx={{
              flex: 1,
              minWidth: 0,
              minHeight: 0,
              position: "relative",
              overflow: "scroll",
              scrollbarGutter: "stable",
              overscrollBehavior: "contain",
              touchAction: "none",
              cursor: isPanning ? "grabbing" : "grab",
              userSelect: isPanning ? "none" : "auto",
              bgcolor: chrome.canvasBg,
              "&::-webkit-scrollbar": { width: 13, height: 13 },
              "&::-webkit-scrollbar-track": { bgcolor: chrome.scrollbarTrack },
              "&::-webkit-scrollbar-thumb": {
                bgcolor: chrome.scrollbarThumb,
                borderRadius: 10,
                border: `3px solid ${chrome.scrollbarTrack}`,
              },
              "&::-webkit-scrollbar-thumb:hover": {
                bgcolor: chrome.scrollbarThumbHover,
              },
            }}
          >
            {activePage.nodes.length === 0 ? (
              <EmptyHierarchy />
            ) : activePage.pageType === "overview" ? (
              <OverviewCanvas page={activePage} zoom={zoom} onEdit={onEdit} />
            ) : activePage.pageType === "member" ? (
              <MemberA3Page page={activePage} zoom={zoom} onEdit={onEdit} />
            ) : (
              <ManagerA3Page page={activePage} zoom={zoom} onEdit={onEdit} />
            )}
          </Box>
        </Box>
      </Paper>
    </HierarchyThemeContext.Provider>
  );
}

type HierarchyToolbarProps = {
  pageLabel: string;
  nodeCount: number;
  zoom: number;
  isFullscreen: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onToggleFullscreen: () => void;
  onPrint: () => void;
  onExportPdf: () => void;
  onExportHtml: () => void;
};

function HierarchyToolbar({
  pageLabel,
  nodeCount,
  zoom,
  isFullscreen,
  refreshing = false,
  onRefresh,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onToggleFullscreen,
  onPrint,
  onExportPdf,
  onExportHtml,
}: HierarchyToolbarProps) {
  const { chrome } = useHierarchyTheme();
  const actionButtonSx = {
    height: 29,
    minWidth: 0,
    px: 1.05,
    borderRadius: 1.2,
    borderColor: chrome.buttonBorder,
    color: chrome.title,
    bgcolor: chrome.buttonBg,
    fontSize: 10.5,
    lineHeight: 1,
    fontWeight: 850,
    textTransform: "none" as const,
    whiteSpace: "nowrap" as const,
    "&:hover": {
      borderColor: chrome.accent,
      bgcolor: chrome.buttonHover,
    },
  };
  const zoomButtonSx = {
    width: 29,
    height: 29,
    color: chrome.title,
    bgcolor: chrome.buttonBg,
    border: `1px solid ${chrome.buttonBorder}`,
    "&:hover": { bgcolor: chrome.buttonHover },
  };

  return (
    <Stack
      direction={{ xs: "column", md: "row" }}
      alignItems={{ xs: "stretch", md: "center" }}
      justifyContent="space-between"
      gap={1.25}
      sx={{
        minHeight: 68,
        px: { xs: 1.5, sm: 2 },
        py: 1.15,
        borderBottom: `1px solid ${chrome.toolbarBorder}`,
        background: chrome.toolbarBg,
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1.15}>
        <Box
          sx={{
            width: 38,
            height: 38,
            display: "grid",
            placeItems: "center",
            borderRadius: 2,
            color: "#ffffff",
            bgcolor: chrome.accent,
          }}
        >
          <AccountTreeRoundedIcon fontSize="small" />
        </Box>

        <Box>
          <Typography sx={{ color: chrome.title, fontSize: 17, fontWeight: 900 }}>
            Department Hierarchy
          </Typography>
          <Typography variant="caption" sx={{ color: chrome.subtitle }}>
            Overview · Member pages · Manager pages · Double-click a card to edit
          </Typography>
        </Box>
      </Stack>

      <Stack
        direction="row"
        alignItems="center"
        justifyContent="flex-end"
        spacing={0.55}
        sx={{ flexWrap: "wrap", rowGap: 0.65 }}
      >
        <Chip
          size="small"
          variant="outlined"
          label="Drag canvas to move"
          sx={{
            height: 27,
            color: chrome.chipText,
            bgcolor: chrome.chipBg,
            borderColor: chrome.chipBorder,
            fontWeight: 750,
          }}
        />

        {onRefresh ? (
          <Tooltip title="Reload departments from database">
            <span>
              <Button
                size="small"
                variant="outlined"
                disabled={refreshing}
                startIcon={
                  <RefreshRoundedIcon
                    sx={{
                      fontSize: 16,
                      animation: refreshing
                        ? "hierarchy-refresh-spin 0.8s linear infinite"
                        : "none",
                      "@keyframes hierarchy-refresh-spin": {
                        from: { transform: "rotate(0deg)" },
                        to: { transform: "rotate(360deg)" },
                      },
                    }}
                  />
                }
                onClick={onRefresh}
                sx={actionButtonSx}
              >
                {refreshing ? "Refreshing…" : "Refresh"}
              </Button>
            </span>
          </Tooltip>
        ) : null}

        <Button
          size="small"
          variant="outlined"
          startIcon={<PrintRoundedIcon sx={{ fontSize: 16 }} />}
          onClick={onPrint}
          sx={actionButtonSx}
        >
          Print
        </Button>

        <Tooltip title="Open the browser print dialog and choose Save as PDF">
          <Button
            size="small"
            variant="outlined"
            startIcon={<PictureAsPdfRoundedIcon sx={{ fontSize: 16 }} />}
            onClick={onExportPdf}
            sx={actionButtonSx}
          >
            PDF
          </Button>
        </Tooltip>

        <Button
          size="small"
          variant="outlined"
          startIcon={<CodeRoundedIcon sx={{ fontSize: 16 }} />}
          onClick={onExportHtml}
          sx={actionButtonSx}
        >
          HTML
        </Button>

        <Tooltip title={isFullscreen ? "Exit full screen" : "Show chart full screen"}>
          <Button
            size="small"
            variant={isFullscreen ? "contained" : "outlined"}
            startIcon={
              isFullscreen ? (
                <FullscreenExitRoundedIcon sx={{ fontSize: 16 }} />
              ) : (
                <FullscreenRoundedIcon sx={{ fontSize: 16 }} />
              )
            }
            onClick={onToggleFullscreen}
            sx={
              isFullscreen
                ? {
                    ...actionButtonSx,
                    color: "#ffffff",
                    bgcolor: chrome.accent,
                    borderColor: chrome.accent,
                    "&:hover": {
                      bgcolor: chrome.accent,
                      borderColor: chrome.accent,
                      filter: "brightness(1.08)",
                    },
                  }
                : actionButtonSx
            }
          >
            {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          </Button>
        </Tooltip>

        <Divider orientation="vertical" flexItem sx={{ mx: 0.25, borderColor: chrome.toolbarBorder }} />

        <Chip
          size="small"
          label={pageLabel}
          sx={{
            maxWidth: 230,
            height: 27,
            color: chrome.chipStrongText,
            bgcolor: chrome.chipStrongBg,
            border: `1px solid ${chrome.chipBorder}`,
            fontWeight: 750,
            "& .MuiChip-label": {
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            },
          }}
        />
        <Chip
          size="small"
          variant="outlined"
          label={`${nodeCount} departments`}
          sx={{ height: 27, borderColor: chrome.chipBorder, color: chrome.chipText, fontWeight: 750 }}
        />
        <Chip
          size="small"
          label={`${Math.round(zoom * 100)}%`}
          sx={{
            minWidth: 58,
            height: 27,
            color: "#ffffff",
            bgcolor: chrome.accent,
            fontWeight: 850,
          }}
        />

        <Tooltip title="Zoom out">
          <span>
            <IconButton
              size="small"
              onClick={onZoomOut}
              disabled={zoom <= MIN_ZOOM}
              sx={zoomButtonSx}
            >
              <ZoomOutRoundedIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>

        <Tooltip title="Reset zoom">
          <IconButton size="small" onClick={onResetZoom} sx={zoomButtonSx}>
            <RestartAltRoundedIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        <Tooltip title="Zoom in">
          <span>
            <IconButton
              size="small"
              onClick={onZoomIn}
              disabled={zoom >= MAX_ZOOM}
              sx={zoomButtonSx}
            >
              <ZoomInRoundedIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>
    </Stack>
  );
}

type HierarchySidebarProps = {
  pages: HierarchyPage[];
  activePageId: string;
  expanded: boolean;
  width: number;
  onToggle: () => void;
  onSelect: (pageId: string) => void;
};

function HierarchySidebar({
  pages,
  activePageId,
  expanded,
  width,
  onToggle,
  onSelect,
}: HierarchySidebarProps) {
  const { chrome } = useHierarchyTheme();

  return (
    <Box
      component="aside"
      sx={{
        width,
        minWidth: width,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        borderRight: `1px solid ${chrome.sidebarBorder}`,
        bgcolor: chrome.sidebarBg,
        transition: "width 180ms ease, min-width 180ms ease",
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        justifyContent={expanded ? "space-between" : "center"}
        sx={{ height: 52, minHeight: 52, px: expanded ? 1.25 : 0.75 }}
      >
        {expanded ? (
          <Box>
            <Typography
              sx={{
                color: chrome.sidebarTitle,
                fontSize: 11,
                lineHeight: 1.1,
                fontWeight: 900,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              Hierarchy views
            </Typography>
            <Typography variant="caption" sx={{ color: chrome.sidebarMuted, fontSize: 10 }}>
              {pages.length} views
            </Typography>
          </Box>
        ) : null}

        <Tooltip title={expanded ? "Collapse list" : "Expand list"} placement="right">
          <IconButton
            size="small"
            onClick={onToggle}
            sx={{
              width: 31,
              height: 31,
              color: chrome.sidebarTitle,
              bgcolor: chrome.sidebarButtonBg,
              border: `1px solid ${chrome.sidebarBorder}`,
              "&:hover": { bgcolor: chrome.sidebarButtonHover },
            }}
          >
            {expanded ? (
              <ChevronLeftRoundedIcon fontSize="small" />
            ) : (
              <ChevronRightRoundedIcon fontSize="small" />
            )}
          </IconButton>
        </Tooltip>
      </Stack>

      <Divider />

      <List
        disablePadding
        sx={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          overflowX: "hidden",
          p: 0.75,
          "&::-webkit-scrollbar": { width: 7 },
          "&::-webkit-scrollbar-thumb": {
            bgcolor: "#c4d2df",
            borderRadius: 10,
          },
        }}
      >
        {pages.map((page, index) => {
          const selected = page.id === activePageId;
          const count = countTreeNodes(page.nodes);

          return (
            <Tooltip
              key={page.id}
              title={expanded ? "" : page.label}
              placement="right"
              arrow
            >
              <ListItemButton
                selected={selected}
                onClick={() => onSelect(page.id)}
                sx={{
                  minHeight: 44,
                  mb: 0.55,
                  px: expanded ? 1 : 0.65,
                  borderRadius: 1.6,
                  justifyContent: expanded ? "flex-start" : "center",
                  border: selected
                    ? `1px solid ${chrome.chipBorder}`
                    : "1px solid transparent",
                  color: selected ? chrome.sidebarSelectedText : chrome.subtitle,
                  bgcolor: selected ? chrome.sidebarSelectedBg : "transparent",
                  "&.Mui-selected": { bgcolor: chrome.sidebarSelectedBg },
                  "&.Mui-selected:hover": { bgcolor: chrome.sidebarSelectedHover },
                  "&:hover": { bgcolor: selected ? chrome.sidebarSelectedHover : chrome.sidebarButtonBg },
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: expanded ? 34 : 0,
                    justifyContent: "center",
                    color: "inherit",
                  }}
                >
                  <Box
                    sx={{
                      width: 26,
                      height: 26,
                      display: "grid",
                      placeItems: "center",
                      borderRadius: 1.2,
                      color: selected ? "#ffffff" : chrome.subtitle,
                      bgcolor: selected ? chrome.sidebarIconSelectedBg : chrome.sidebarIconBg,
                      fontSize: 10,
                      fontWeight: 900,
                    }}
                  >
                    {page.pageType === "overview" ? (
                      <AccountTreeRoundedIcon sx={{ fontSize: 15 }} />
                    ) : page.pageType === "member" ? (
                      <HubRoundedIcon sx={{ fontSize: 15 }} />
                    ) : (
                      index
                    )}
                  </Box>
                </ListItemIcon>

                {expanded ? (
                  <ListItemText
                    primary={page.label}
                    secondary={
                      page.pageType === "overview"
                        ? `${count} departments`
                        : page.pageType === "member"
                          ? `Member · ${count} departments`
                          : `Manager · ${count} departments`
                    }
                    primaryTypographyProps={{
                      noWrap: true,
                      sx: { fontSize: 11.5, fontWeight: selected ? 850 : 700 },
                    }}
                    secondaryTypographyProps={{
                      noWrap: true,
                      sx: { color: "#8799aa", fontSize: 9.5 },
                    }}
                  />
                ) : null}
              </ListItemButton>
            </Tooltip>
          );
        })}
      </List>

      {expanded ? (
        <Box
          sx={{
            px: 1.5,
            py: 1.15,
            borderTop: `1px solid ${chrome.sidebarBorder}`,
            bgcolor: chrome.sidebarFooterBg,
          }}
        >
          <Typography variant="caption" sx={{ color: chrome.sidebarMuted, fontSize: 9.5 }}>
            Overview (Top management) → Members → Managers · sorted by Report To.
          </Typography>
        </Box>
      ) : null}
    </Box>
  );
}

type PageCanvasProps = {
  page: HierarchyPage;
  zoom: number;
  onEdit: (department: DepartmentEditTarget) => void;
};

function OverviewCanvas({ page, zoom, onEdit }: PageCanvasProps) {
  const { chrome } = useHierarchyTheme();

  return (
    <Box
      sx={{
        width: "max-content",
        minWidth: "100%",
        minHeight: "100%",
        px: { xs: 2.5, sm: 4 },
        py: { xs: 2.5, sm: 4 },
      }}
    >
      <Box
        sx={{
          width: "max-content",
          minWidth: "100%",
          zoom,
          transition: "zoom 150ms ease",
        }}
      >
        <Box
          data-hierarchy-export-root="true"
          data-page-size="a3-landscape"
          sx={{
            width: "max-content",
            minWidth: "100%",
            minHeight: 760,
            px: 4,
            py: 3.5,
            bgcolor: chrome.pageBg,
            fontFamily: '"Inter", "Segoe UI", Arial, sans-serif',
          }}
        >
          <Stack alignItems="center" spacing={4} sx={{ width: "max-content", minWidth: "100%" }}>
            {page.nodes.map((node) =>
              isDepartmentType(node, "top management") ? (
                <ExecutiveOverviewRoot
                  key={node.row.id}
                  node={node}
                  onEdit={onEdit}
                />
              ) : (
                <Box component="ul" key={node.row.id} sx={overviewRootListSx}>
                  <OverviewBranch
                    node={node}
                    level={page.rootLevel}
                    siblingCount={page.nodes.length}
                    onEdit={onEdit}
                  />
                </Box>
              ),
            )}
          </Stack>
        </Box>
      </Box>
    </Box>
  );
}

type ExecutiveOverviewRootProps = {
  node: DepartmentTreeNode;
  onEdit: (department: DepartmentEditTarget) => void;
};

function ExecutiveOverviewRoot({ node, onEdit }: ExecutiveOverviewRootProps) {
  const members = node.children.filter((child) => isDepartmentType(child, "member"));
  const directManagers = node.children.filter((child) =>
    isDepartmentType(child, "manager"),
  );
  const otherDirectReports = node.children.filter(
    (child) =>
      !isDepartmentType(child, "member") &&
      !isDepartmentType(child, "manager"),
  );
  const directReports = [...directManagers, ...otherDirectReports];
  const groupCount = members.length + (directReports.length > 0 ? 1 : 0);
  const naturalWidth =
    Math.max(1, groupCount) * OVERVIEW_GROUP_WIDTH +
    Math.max(0, groupCount - 1) * OVERVIEW_GROUP_GAP;

  return (
    <Box
      sx={{
        width: "max-content",
        minWidth: Math.max(960, naturalWidth),
        px: 1,
      }}
    >
      <Stack alignItems="center">
        <OverviewNodeCard department={node.row} level={0} onEdit={onEdit} />

        {groupCount > 0 ? <Box sx={overviewExecutiveStemSx} /> : null}

        {groupCount > 0 ? (
          <Box
            sx={{
              ...overviewPortfolioRailSx,
              "&::before": {
                ...overviewPortfolioRailSx["&::before"],
                display: groupCount > 1 ? "block" : "none",
              },
            }}
          >
            {members.map((member) => (
              <OverviewPortfolioColumn
                key={member.row.id}
                headerNode={member}
                managerNodes={member.children}
                onEdit={onEdit}
              />
            ))}

            {directReports.length > 0 ? (
              <OverviewPortfolioColumn
                title="Direct management"
                subtitle="Reports to Chairman Office"
                managerNodes={directReports}
                onEdit={onEdit}
              />
            ) : null}
          </Box>
        ) : null}
      </Stack>
    </Box>
  );
}

type OverviewPortfolioColumnProps = {
  headerNode?: DepartmentTreeNode;
  title?: string;
  subtitle?: string;
  managerNodes: DepartmentTreeNode[];
  onEdit: (department: DepartmentEditTarget) => void;
};

function OverviewPortfolioColumn({
  headerNode,
  title,
  subtitle,
  managerNodes,
  onEdit,
}: OverviewPortfolioColumnProps) {
  const { chrome, isDark } = useHierarchyTheme();

  return (
    <Box sx={overviewPortfolioColumnSx}>
      <Paper
        elevation={0}
        sx={{
          ...overviewPortfolioPanelSx,
          border: `1px solid ${chrome.pageBorder}`,
          bgcolor: isDark ? "#151c2c" : "#fcfcff",
          boxShadow: isDark
            ? "0 4px 14px rgba(0,0,0,0.28)"
            : "0 4px 14px rgba(47,42,90,0.06)",
        }}
      >
        {headerNode ? (
          <OverviewNodeCard
            department={headerNode.row}
            level={1}
            onEdit={onEdit}
          />
        ) : (
          <OverviewDirectGroupCard
            title={title ?? "Direct management"}
            subtitle={subtitle ?? "Reports to top management"}
            count={countTreeNodes(managerNodes)}
          />
        )}

        {managerNodes.length > 0 ? (
          <OverviewManagerList nodes={managerNodes} onEdit={onEdit} />
        ) : (
          <Box
            sx={{
              ...overviewEmptyGroupSx,
              border: `1px dashed ${chrome.chipBorder}`,
              bgcolor: isDark ? "#1a2333" : "#ffffff",
              color: chrome.subtitle,
            }}
          >
            No departments assigned
          </Box>
        )}
      </Paper>
    </Box>
  );
}

function OverviewManagerList({
  nodes,
  onEdit,
}: {
  nodes: DepartmentTreeNode[];
  onEdit: (department: DepartmentEditTarget) => void;
}) {
  return (
    <Box component="ul" sx={overviewManagerStackSx}>
      {nodes.map((node) => (
        <Box component="li" key={node.row.id} sx={overviewManagerStackItemSx}>
          <OverviewNodeCard department={node.row} level={2} onEdit={onEdit} />
        </Box>
      ))}
    </Box>
  );
}

function OverviewDirectGroupCard({
  title,
  subtitle,
  count,
}: {
  title: string;
  subtitle: string;
  count: number;
}) {
  const { chrome, isDark } = useHierarchyTheme();

  return (
    <Box
      sx={{
        width: 198,
        minHeight: 70,
        display: "flex",
        alignItems: "center",
        gap: 1,
        px: 1.15,
        py: 0.85,
        borderRadius: 1.8,
        border: `1.5px solid ${chrome.chipBorder}`,
        bgcolor: isDark ? "#1a2333" : "#f5f8fb",
        color: chrome.title,
      }}
    >
      <Box
        sx={{
          width: 32,
          height: 32,
          display: "grid",
          placeItems: "center",
          flex: "0 0 auto",
          borderRadius: 1.2,
          bgcolor: isDark ? "#243044" : "#e3ebf2",
          color: chrome.subtitle,
        }}
      >
        <HubRoundedIcon sx={{ fontSize: 18 }} />
      </Box>

      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontSize: 11.2, lineHeight: 1.15, fontWeight: 900 }}>
          {title}
        </Typography>
        <Typography sx={{ mt: 0.2, color: chrome.subtitle, fontSize: 8.8, lineHeight: 1.25 }}>
          {subtitle} · {count} departments
        </Typography>
      </Box>
    </Box>
  );
}

function ManagerA3Page({ page, zoom, onEdit }: PageCanvasProps) {
  const { chrome } = useHierarchyTheme();
  const managerNode = page.nodes[0];
  const divisions = managerNode.children.filter((node) =>
    isDepartmentType(node, "division"),
  );
  const directReports = managerNode.children.filter(
    (node) => !isDepartmentType(node, "division"),
  );
  const { withCoordinators, withoutCoordinators } = useMemo(
    () => splitDivisionsByCoordinator(divisions),
    [divisions],
  );
  const fit = useMemo(() => createManagerPageFit(managerNode), [managerNode]);
  const columnCount =
    withCoordinators.length +
    (withoutCoordinators.length > 0 ? 1 : 0) +
    (directReports.length > 0 ? 1 : 0);

  return (
    <Box
      sx={{
        width: "max-content",
        minWidth: "100%",
        minHeight: "100%",
        px: { xs: 2, sm: 3 },
        py: { xs: 2, sm: 3 },
      }}
    >
      <Box
        sx={{
          width: "max-content",
          minWidth: "100%",
          display: "flex",
          justifyContent: "center",
          zoom,
          transition: "zoom 150ms ease",
        }}
      >
        <Paper
          elevation={0}
          data-hierarchy-export-root="true"
          data-page-size="a3-landscape"
          sx={{
            width: A3_WIDTH,
            height: A3_HEIGHT,
            flex: "0 0 auto",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            borderRadius: 1.5,
            border: `1px solid ${chrome.pageBorder}`,
            bgcolor: chrome.pageBg,
            boxShadow: chrome.pageShadow,
          }}
        >
          <ManagerPageHeader
            title={page.label}
            count={countTreeNodes(page.nodes)}
            divisions={divisions.length}
            fitScale={fit.scale}
          />

          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              position: "relative",
              overflow: "hidden",
              bgcolor: chrome.pageBg,
            }}
          >
            <Box
              sx={{
                width: "max-content",
                minWidth: "100%",
                minHeight: "100%",
                display: "flex",
                justifyContent: "center",
                alignItems: "flex-start",
                px: 5,
                pt: 3.5,
                pb: 2,
                zoom: fit.scale,
              }}
            >
              <Stack alignItems="center" sx={{ width: "max-content" }}>
                <DetailNodeCard
                  department={managerNode.row}
                  kind="manager"
                  onEdit={onEdit}
                />

                {columnCount > 0 ? (
                  <Box sx={managerToColumnsConnectorSx} />
                ) : null}

                {columnCount > 0 ? (
                  <Box
                    sx={{
                      ...detailColumnsRailSx,
                      "&::before": {
                        ...detailColumnsRailSx["&::before"],
                        display: columnCount > 1 ? "block" : "none",
                      },
                    }}
                  >
                    {withCoordinators.map((division) => (
                      <DetailColumn key={division.row.id}>
                        <DetailNodeCard
                          department={division.row}
                          kind="division"
                          onEdit={onEdit}
                        />

                        <VerticalHierarchyList
                          nodes={division.children}
                          depth={0}
                          onEdit={onEdit}
                        />
                      </DetailColumn>
                    ))}

                    {withoutCoordinators.length > 0 ? (
                      <DetailColumn>
                        <DivisionListCard count={withoutCoordinators.length} />
                        <VerticalHierarchyList
                          nodes={withoutCoordinators}
                          depth={0}
                          onEdit={onEdit}
                        />
                      </DetailColumn>
                    ) : null}

                    {directReports.length > 0 ? (
                      <DetailColumn>
                        <DirectReportsCard count={countTreeNodes(directReports)} />
                        <VerticalHierarchyList
                          nodes={directReports}
                          depth={0}
                          onEdit={onEdit}
                        />
                      </DetailColumn>
                    ) : null}
                  </Box>
                ) : (
                  <EmptyColumnMessage text="No Divisions or Coordinators are reported to this Manager" />
                )}
              </Stack>
            </Box>
          </Box>

          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{
              minHeight: 30,
              px: 3,
              borderTop: "1px solid #e1e8ef",
              bgcolor: "#f7f9fb",
            }}
          >
            <Typography variant="caption" sx={{ color: "#7c8e9f", fontSize: 9.5 }}>
              Divisions with Coordinators: horizontal · Divisions without Coordinators: vertical
            </Typography>
            <Typography variant="caption" sx={{ color: "#7c8e9f", fontSize: 9.5 }}>
              A3 Landscape · 420 × 297 mm · {A3_WIDTH} × {A3_HEIGHT}px
            </Typography>
          </Stack>
        </Paper>
      </Box>
    </Box>
  );
}

function MemberA3Page({ page, zoom, onEdit }: PageCanvasProps) {
  const { chrome } = useHierarchyTheme();
  const memberNode = page.nodes[0];
  const {
    divisions,
    coordinators,
    managers,
    otherDirectReports,
    withCoordinators,
    withoutCoordinators,
  } = useMemo(() => splitMemberDirectReports(memberNode), [memberNode]);
  const fit = useMemo(() => createMemberPageFit(memberNode), [memberNode]);
  const columnCount =
    withCoordinators.length +
    (withoutCoordinators.length > 0 ? 1 : 0) +
    coordinators.length +
    managers.length +
    (otherDirectReports.length > 0 ? 1 : 0);
  const directReportCount =
    divisions.length +
    coordinators.length +
    managers.length +
    otherDirectReports.length;

  return (
    <Box
      sx={{
        width: "max-content",
        minWidth: "100%",
        minHeight: "100%",
        px: { xs: 2, sm: 3 },
        py: { xs: 2, sm: 3 },
      }}
    >
      <Box
        sx={{
          width: "max-content",
          minWidth: "100%",
          display: "flex",
          justifyContent: "center",
          zoom,
          transition: "zoom 150ms ease",
        }}
      >
        <Paper
          elevation={0}
          data-hierarchy-export-root="true"
          data-page-size="a3-landscape"
          sx={{
            width: A3_WIDTH,
            height: A3_HEIGHT,
            flex: "0 0 auto",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            borderRadius: 1.5,
            border: `1px solid ${chrome.pageBorder}`,
            bgcolor: chrome.pageBg,
            boxShadow: chrome.pageShadow,
          }}
        >
          <MemberPageHeader
            title={page.label}
            count={countTreeNodes(page.nodes)}
            directReports={directReportCount}
            fitScale={fit.scale}
          />

          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              position: "relative",
              overflow: "hidden",
              bgcolor: chrome.pageBg,
            }}
          >
            <Box
              sx={{
                width: "max-content",
                minWidth: "100%",
                minHeight: "100%",
                display: "flex",
                justifyContent: "center",
                alignItems: "flex-start",
                px: 5,
                pt: 3.5,
                pb: 2,
                zoom: fit.scale,
              }}
            >
              <Stack alignItems="center" sx={{ width: "max-content" }}>
                <DetailNodeCard
                  department={memberNode.row}
                  kind="member"
                  onEdit={onEdit}
                />

                {columnCount > 0 ? (
                  <Box sx={managerToColumnsConnectorSx} />
                ) : null}

                {columnCount > 0 ? (
                  <Box
                    sx={{
                      ...detailColumnsRailSx,
                      "&::before": {
                        ...detailColumnsRailSx["&::before"],
                        display: columnCount > 1 ? "block" : "none",
                      },
                    }}
                  >
                    {withCoordinators.map((division) => (
                      <DetailColumn key={division.row.id}>
                        <DetailNodeCard
                          department={division.row}
                          kind="division"
                          onEdit={onEdit}
                        />

                        <VerticalHierarchyList
                          nodes={division.children}
                          depth={0}
                          onEdit={onEdit}
                        />
                      </DetailColumn>
                    ))}

                    {withoutCoordinators.length > 0 ? (
                      <DetailColumn>
                        <DivisionListCard count={withoutCoordinators.length} />
                        <VerticalHierarchyList
                          nodes={withoutCoordinators}
                          depth={0}
                          onEdit={onEdit}
                        />
                      </DetailColumn>
                    ) : null}

                    {coordinators.map((coordinator) => (
                      <DetailColumn key={coordinator.row.id}>
                        <DetailNodeCard
                          department={coordinator.row}
                          kind="coordinator"
                          onEdit={onEdit}
                        />

                        <VerticalHierarchyList
                          nodes={coordinator.children}
                          depth={0}
                          onEdit={onEdit}
                        />
                      </DetailColumn>
                    ))}

                    {managers.map((manager) => (
                      <DetailColumn key={manager.row.id}>
                        <DetailNodeCard
                          department={manager.row}
                          kind="manager"
                          onEdit={onEdit}
                        />
                      </DetailColumn>
                    ))}

                    {otherDirectReports.length > 0 ? (
                      <DetailColumn>
                        <DirectReportsCard
                          count={countTreeNodes(otherDirectReports)}
                        />
                        <VerticalHierarchyList
                          nodes={otherDirectReports}
                          depth={0}
                          onEdit={onEdit}
                        />
                      </DetailColumn>
                    ) : null}
                  </Box>
                ) : (
                  <EmptyColumnMessage text="No Divisions, Coordinators, Sections, or Managers report directly to this Member" />
                )}
              </Stack>
            </Box>
          </Box>

          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{
              minHeight: 30,
              px: 3,
              borderTop: `1px solid ${chrome.footerBorder}`,
              bgcolor: chrome.footerBg,
            }}
          >
            <Typography
              variant="caption"
              sx={{ color: chrome.subtitle, fontSize: 9.5 }}
            >
              Direct reports only · Managers shown side by side · Divisions & Coordinators when they report to Member
            </Typography>
            <Typography
              variant="caption"
              sx={{ color: chrome.subtitle, fontSize: 9.5 }}
            >
              A3 Landscape · 420 × 297 mm · {A3_WIDTH} × {A3_HEIGHT}px
            </Typography>
          </Stack>
        </Paper>
      </Box>
    </Box>
  );
}

type ManagerPageHeaderProps = {
  title: string;
  count: number;
  divisions: number;
  fitScale: number;
};

function ManagerPageHeader({
  title,
  count,
  divisions,
  fitScale,
}: ManagerPageHeaderProps) {
  const { chrome } = useHierarchyTheme();

  return (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      spacing={2}
      sx={{
        minHeight: 70,
        px: 3.25,
        py: 1.35,
        borderBottom: `1px solid ${chrome.headerBorder}`,
        bgcolor: chrome.headerBg,
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1.1}>
        <Box
          sx={{
            width: 35,
            height: 35,
            display: "grid",
            placeItems: "center",
            borderRadius: 1.7,
            color: "#ffffff",
            bgcolor: chrome.accent,
          }}
        >
          <AccountTreeRoundedIcon sx={{ fontSize: 20 }} />
        </Box>
        <Box>
          <Typography sx={{ color: chrome.title, fontSize: 18, fontWeight: 900 }}>
            {title}
          </Typography>
          <Typography variant="caption" sx={{ color: chrome.subtitle, fontSize: 12 }}>
            Manager organizational page · A3 Landscape
          </Typography>
        </Box>
      </Stack>

      <Stack direction="row" spacing={0.65}>
        <Chip
          size="small"
          label={`${count} departments`}
          sx={{
            height: 25,
            color: chrome.chipStrongText,
            bgcolor: chrome.chipBg,
            border: `1px solid ${chrome.chipBorder}`,
            fontSize: 10,
            fontWeight: 800,
          }}
        />
        <Chip
          size="small"
          label={`${divisions} Divisions`}
          sx={{
            height: 25,
            color: chrome.chipStrongText,
            bgcolor: chrome.chipBg,
            border: `1px solid ${chrome.chipBorder}`,
            fontSize: 10,
            fontWeight: 800,
          }}
        />
        <Chip
          size="small"
          label={`${Math.round(fitScale * 100)}% fit`}
          sx={{
            height: 25,
            color: "#ffffff",
            bgcolor: chrome.accent,
            border: `1px solid ${chrome.accent}`,
            fontSize: 10,
            fontWeight: 800,
          }}
        />
      </Stack>
    </Stack>
  );
}

type MemberPageHeaderProps = {
  title: string;
  count: number;
  directReports: number;
  fitScale: number;
};

function MemberPageHeader({
  title,
  count,
  directReports,
  fitScale,
}: MemberPageHeaderProps) {
  const { chrome } = useHierarchyTheme();

  return (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      spacing={2}
      sx={{
        minHeight: 70,
        px: 3.25,
        py: 1.35,
        borderBottom: `1px solid ${chrome.headerBorder}`,
        bgcolor: chrome.headerBg,
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1.1}>
        <Box
          sx={{
            width: 35,
            height: 35,
            display: "grid",
            placeItems: "center",
            borderRadius: 1.7,
            color: "#ffffff",
            bgcolor: "#2f2a5a",
          }}
        >
          <HubRoundedIcon sx={{ fontSize: 20 }} />
        </Box>
        <Box>
          <Typography sx={{ color: chrome.title, fontSize: 18, fontWeight: 900 }}>
            {title}
          </Typography>
          <Typography variant="caption" sx={{ color: chrome.subtitle, fontSize: 12 }}>
            Member page · Direct reports only · A3 Landscape
          </Typography>
        </Box>
      </Stack>

      <Stack direction="row" spacing={0.65}>
        <Chip
          size="small"
          label={`${count} departments`}
          sx={{
            height: 25,
            color: chrome.chipStrongText,
            bgcolor: chrome.chipBg,
            border: `1px solid ${chrome.chipBorder}`,
            fontSize: 10,
            fontWeight: 800,
          }}
        />
        <Chip
          size="small"
          label={`${directReports} direct reports`}
          sx={{
            height: 25,
            color: chrome.chipStrongText,
            bgcolor: chrome.chipBg,
            border: `1px solid ${chrome.chipBorder}`,
            fontSize: 10,
            fontWeight: 800,
          }}
        />
        <Chip
          size="small"
          label={`${Math.round(fitScale * 100)}% fit`}
          sx={{
            height: 25,
            color: "#ffffff",
            bgcolor: chrome.accent,
            border: `1px solid ${chrome.accent}`,
            fontSize: 10,
            fontWeight: 800,
          }}
        />
      </Stack>
    </Stack>
  );
}

type DetailColumnProps = {
  children: ReactNode;
};

function DetailColumn({ children }: DetailColumnProps) {
  return <Box sx={detailColumnSx}>{children}</Box>;
}

type VerticalHierarchyListProps = {
  nodes: DepartmentTreeNode[];
  depth: number;
  onEdit: (department: DepartmentEditTarget) => void;
};

function VerticalHierarchyList({
  nodes,
  depth,
  onEdit,
}: VerticalHierarchyListProps) {
  return (
    <Box
      component="ul"
      sx={{
        ...verticalDetailListSx,
        ml: depth === 0 ? 2.1 : 1.75,
        mt: depth === 0 ? 0 : `${DETAIL_VERTICAL_GAP * 0.7}px`,
        pt: `${Math.round(DETAIL_VERTICAL_GAP * 0.35)}px`,
        gap: `${DETAIL_VERTICAL_GAP}px`,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {nodes.map((node) => (
        <Box component="li" key={node.row.id} sx={verticalDetailItemSx}>
          <DetailNodeCard
            department={node.row}
            kind={normalizeDepartmentType(node.row.departmentType)}
            onEdit={onEdit}
          />

          {node.children.length > 0 ? (
            <VerticalHierarchyList
              nodes={node.children}
              depth={depth + 1}
              onEdit={onEdit}
            />
          ) : null}
        </Box>
      ))}
    </Box>
  );
}

type DetailNodeCardProps = {
  department: DepartmentEditTarget;
  kind: string;
  onEdit: (department: DepartmentEditTarget) => void;
};

function DetailNodeCard({
  department,
  kind,
  onEdit,
}: DetailNodeCardProps) {
  const { isDark } = useHierarchyTheme();
  const palette = getDetailPalette(kind || department.departmentType, isDark);
  const isManager = kind === "manager";
  const isMember = kind === "member";
  const isDivision = kind === "division";
  const width = isManager || isMember ? 228 : isDivision ? 200 : 188;

  const englishName =
    department.departmentNameEnglish?.trim() || "Unnamed Department";
  const arabicName = department.departmentNameArabic?.trim() || "بدون اسم";

  return (
    <Paper
      elevation={0}
      data-pan-ignore="true"
      title={`${englishName} / ${arabicName}`}
      onDoubleClick={() => onEdit(department)}
      sx={{
        position: "relative",
        width,
        minHeight: isManager || isMember ? 86 : 78,
        px: 1.15,
        py: 0.9,
        overflow: "hidden",
        borderRadius: 1.4,
        border: `1.5px solid ${palette.border}`,
        bgcolor: palette.background,
        color: palette.text,
        fontFamily: '"Inter", "Segoe UI", Arial, sans-serif',
        boxShadow: "none",
        transition: "border-color 140ms ease, background-color 140ms ease",
        "&::before": {
          content: '\"\"',
          position: "absolute",
          inset: "0 auto 0 0",
          width: 4,
          bgcolor: palette.accent,
        },
        "&:hover": {
          bgcolor: palette.badgeBackground,
          borderColor: palette.accent,
        },
      }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={0.5}>
        <Typography
          noWrap
          sx={{
            maxWidth: "calc(100% - 28px)",
            px: 0.7,
            py: 0.28,
            borderRadius: 0.8,
            bgcolor: palette.badgeBackground,
            color: palette.text,
            fontSize: 11,
            lineHeight: 1.2,
            fontWeight: 900,
            letterSpacing: "0.015em",
          }}
        >
          {department.departmentType || "Department"} · ID {department.id}
        </Typography>

        <Tooltip title="Edit department">
          <IconButton
            data-export-hide="true"
            size="small"
            onClick={(event) => {
              event.stopPropagation();
              onEdit(department);
            }}
            sx={{
              width: 26,
              height: 26,
              color: palette.accent,
              bgcolor: isDark ? "rgba(15,22,35,0.55)" : "rgba(255,255,255,0.65)",
              border: `1.5px solid ${palette.border}`,
              borderRadius: 1,
              "&:hover": { bgcolor: isDark ? "rgba(15,22,35,0.9)" : "#ffffff" },
            }}
          >
            <EditRoundedIcon sx={{ fontSize: 15 }} />
          </IconButton>
        </Tooltip>
      </Stack>

      <Typography
        sx={{
          mt: 0.55,
          px: 0.25,
          color: palette.text,
          fontSize: isManager || isMember ? 16.5 : isDivision ? 14.2 : 13.2,
          lineHeight: 1.2,
          fontWeight: 900,
          letterSpacing: "-0.01em",
          textAlign: "center",
          wordBreak: "break-word",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {englishName}
      </Typography>

      <Typography
        dir="rtl"
        sx={{
          mt: 0.35,
          px: 0.25,
          color: palette.mutedText,
          fontFamily: '"Noto Sans Arabic", "Segoe UI", Tahoma, Arial, sans-serif',
          fontSize: isManager || isMember ? 13 : 12,
          lineHeight: 1.3,
          fontWeight: 700,
          textAlign: "center",
          wordBreak: "break-word",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {arabicName}
      </Typography>
    </Paper>
  );
}

function DivisionListCard({ count }: { count: number }) {
  const { isDark } = useHierarchyTheme();

  return (
    <Paper
      elevation={0}
      sx={{
        width: 220,
        minHeight: DETAIL_CARD_HEIGHT,
        display: "flex",
        alignItems: "center",
        gap: 1.1,
        px: 1.35,
        py: 1,
        borderRadius: 1.4,
        border: `2px solid ${isDark ? "#3d7a6a" : "#5f857a"}`,
        bgcolor: isDark ? "#152823" : "#edf5f2",
        color: isDark ? "#b7e0d2" : "#294f45",
      }}
    >
      <Box
        sx={{
          width: 34,
          height: 34,
          display: "grid",
          placeItems: "center",
          flex: "0 0 auto",
          borderRadius: 1.2,
          bgcolor: isDark ? "#1f3d34" : "#d8e9e3",
          color: isDark ? "#86c5b2" : "#3f7567",
        }}
      >
        <AccountTreeRoundedIcon sx={{ fontSize: 20 }} />
      </Box>
      <Box>
        <Typography sx={{ fontSize: 13, lineHeight: 1.2, fontWeight: 850 }}>
          Divisions without Coordinator
        </Typography>
        <Typography variant="caption" sx={{ color: isDark ? "#8fbfb0" : "#66867d", fontSize: 11 }}>
          {count} Divisions · vertical list
        </Typography>
      </Box>
    </Paper>
  );
}

function DirectReportsCard({ count }: { count: number }) {
  const { isDark } = useHierarchyTheme();

  return (
    <Paper
      elevation={0}
      sx={{
        width: 220,
        minHeight: DETAIL_CARD_HEIGHT,
        display: "flex",
        alignItems: "center",
        gap: 1.1,
        px: 1.35,
        py: 1,
        borderRadius: 1.4,
        border: `1px dashed ${isDark ? "#4b6280" : "#7990a4"}`,
        bgcolor: isDark ? "#1a2333" : "#f4f7fa",
        color: isDark ? "#c5d4e4" : "#38536a",
      }}
    >
      <Box
        sx={{
          width: 34,
          height: 34,
          display: "grid",
          placeItems: "center",
          flex: "0 0 auto",
          borderRadius: 1.2,
          bgcolor: isDark ? "#243044" : "#e3ebf2",
          color: isDark ? "#94a3b8" : "#526f86",
        }}
      >
        <HubRoundedIcon sx={{ fontSize: 20 }} />
      </Box>
      <Box>
        <Typography sx={{ fontSize: 13, lineHeight: 1.2, fontWeight: 850 }}>
          Direct reporting
        </Typography>
        <Typography variant="caption" sx={{ color: isDark ? "#94a3b8" : "#7890a3", fontSize: 11 }}>
          {count} departments
        </Typography>
      </Box>
    </Paper>
  );
}

function EmptyColumnMessage({ text }: { text: string }) {
  const { chrome, isDark } = useHierarchyTheme();

  return (
    <Box
      sx={{
        width: 220,
        mt: 1.6,
        px: 1.35,
        py: 1.15,
        borderRadius: 1.2,
        border: `1px dashed ${chrome.chipBorder}`,
        bgcolor: isDark ? "rgba(26,35,51,0.85)" : "rgba(247,250,252,0.85)",
        color: chrome.subtitle,
        fontSize: 12,
        lineHeight: 1.4,
        textAlign: "center",
      }}
    >
      {text}
    </Box>
  );
}

function EmptyHierarchy() {
  const { chrome } = useHierarchyTheme();

  return (
    <Box sx={{ height: "100%", minHeight: 360, display: "grid", placeItems: "center" }}>
      <Stack alignItems="center" spacing={1}>
        <AccountTreeRoundedIcon sx={{ fontSize: 44, color: chrome.emptyIcon }} />
        <Typography sx={{ color: chrome.emptyText, fontWeight: 800 }}>
          No hierarchy data available
        </Typography>
      </Stack>
    </Box>
  );
}

type OverviewBranchProps = {
  node: DepartmentTreeNode;
  level: number;
  siblingCount: number;
  forceVertical?: boolean;
  onEdit: (department: DepartmentEditTarget) => void;
};

const getOverviewLayoutMode = (
  level: number,
  siblingCount: number,
): LayoutMode => {
  if (level <= 1) {
    return "horizontal";
  }

  return siblingCount > 2 ? "vertical" : "horizontal";
};

function OverviewBranch({
  node,
  level,
  siblingCount,
  forceVertical = false,
  onEdit,
}: OverviewBranchProps) {
  const layoutMode: LayoutMode = forceVertical
    ? "vertical"
    : getOverviewLayoutMode(level, siblingCount);

  const isTopManagement = isDepartmentType(node, "top management");
  const managerChildren = isTopManagement
    ? node.children.filter((child) => isDepartmentType(child, "manager"))
    : [];
  const regularChildren = isTopManagement
    ? node.children.filter((child) => !isDepartmentType(child, "manager"))
    : node.children;

  const combinedChildCount =
    regularChildren.length + (managerChildren.length > 0 ? 1 : 0);
  const childrenLayout = getOverviewLayoutMode(level + 1, combinedChildCount);

  return (
    <Box
      component="li"
      sx={layoutMode === "horizontal" ? overviewTreeItemSx : overviewVerticalTreeItemSx}
    >
      <OverviewNodeCard department={node.row} level={level} onEdit={onEdit} />

      {combinedChildCount > 0 ? (
        <Box
          component="ul"
          sx={
            childrenLayout === "horizontal"
              ? overviewChildrenListSx
              : overviewVerticalChildrenListSx
          }
        >
          {regularChildren.map((child) => (
            <OverviewBranch
              key={child.row.id}
              node={child}
              level={level + 1}
              siblingCount={combinedChildCount}
              onEdit={onEdit}
            />
          ))}

          {managerChildren.length > 0 ? (
            <Box component="li" sx={overviewManagerGroupItemSx}>
              <Box component="ul" sx={overviewManagerVerticalListSx}>
                {managerChildren.map((child) => (
                  <OverviewBranch
                    key={child.row.id}
                    node={child}
                    level={level + 1}
                    siblingCount={managerChildren.length}
                    forceVertical
                    onEdit={onEdit}
                  />
                ))}
              </Box>
            </Box>
          ) : null}
        </Box>
      ) : null}
    </Box>
  );
}

function OverviewNodeCard({
  department,
  level: _level,
  onEdit,
}: {
  department: DepartmentEditTarget;
  level: number;
  onEdit: (department: DepartmentEditTarget) => void;
}) {
  const departmentType = normalizeDepartmentType(department.departmentType);
  const { isDark } = useHierarchyTheme();
  const palette = getOverviewPalette(department.departmentType, isDark);
  const isTopManagement = departmentType === "top management";
  const isMember = departmentType === "member";
  const width = isTopManagement ? 244 : isMember ? 198 : 184;
  const minHeight = isTopManagement ? 82 : isMember ? 70 : 64;
  const englishName =
    department.departmentNameEnglish?.trim() || "Unnamed Department";
  const arabicName = department.departmentNameArabic?.trim() || "بدون اسم";

  return (
    <Paper
      elevation={0}
      data-pan-ignore="true"
      onDoubleClick={() => onEdit(department)}
      sx={{
        position: "relative",
        zIndex: 2,
        width,
        minHeight,
        mx: "auto",
        px: isTopManagement ? 1.35 : 1,
        py: isTopManagement ? 1 : 0.8,
        overflow: "hidden",
        borderRadius: isTopManagement ? 2.2 : 1.6,
        border: `1.5px solid ${palette.border}`,
        bgcolor: palette.background,
        color: palette.text,
        fontFamily: '"Inter", "Segoe UI", Arial, sans-serif',
        boxShadow: isTopManagement
          ? "0 8px 22px rgba(16,42,67,0.18)"
          : "none",
        "&::before": {
          content: '\"\"',
          position: "absolute",
          inset: "0 auto 0 0",
          width: isTopManagement ? 6 : 4,
          bgcolor: palette.accent,
        },
        "&:hover": {
          borderColor: palette.accent,
          bgcolor: isTopManagement ? palette.background : palette.badgeBackground,
        },
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={0.5}>
        <Typography
          noWrap
          sx={{
            maxWidth: "calc(100% - 28px)",
            px: 0.7,
            py: 0.22,
            borderRadius: 0.9,
            bgcolor: palette.badgeBackground,
            color: "inherit",
            fontSize: isTopManagement ? 8.8 : 8,
            lineHeight: 1.15,
            fontWeight: 900,
            letterSpacing: "0.015em",
          }}
        >
          {department.departmentType || "Department"} · ID {department.id}
        </Typography>

        <IconButton
          data-export-hide="true"
          size="small"
          onClick={(event) => {
            event.stopPropagation();
            onEdit(department);
          }}
          sx={{
            width: 24,
            height: 24,
            flex: "0 0 auto",
            color: isTopManagement ? "#ffffff" : palette.accent,
            bgcolor: isTopManagement
              ? "rgba(255,255,255,0.13)"
              : isDark
                ? "rgba(15,22,35,0.55)"
                : "rgba(255,255,255,0.72)",
            border: `1px solid ${isTopManagement ? "rgba(255,255,255,0.22)" : palette.border}`,
            borderRadius: 1,
            "&:hover": {
              bgcolor: isTopManagement
                ? "rgba(255,255,255,0.22)"
                : isDark
                  ? "rgba(15,22,35,0.9)"
                  : "#ffffff",
            },
          }}
        >
          <EditRoundedIcon sx={{ fontSize: 13 }} />
        </IconButton>
      </Stack>

      <Typography
        sx={{
          mt: isTopManagement ? 0.7 : 0.5,
          px: 0.25,
          fontSize: isTopManagement ? 17 : isMember ? 12.2 : 11,
          lineHeight: 1.16,
          fontWeight: 900,
          letterSpacing: "-0.012em",
          textAlign: "center",
          wordBreak: "break-word",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {englishName}
      </Typography>

      <Typography
        dir="rtl"
        sx={{
          mt: 0.28,
          px: 0.25,
          color: palette.mutedText,
          fontFamily: '"Noto Sans Arabic", "Segoe UI", Tahoma, Arial, sans-serif',
          fontSize: isTopManagement ? 10.8 : isMember ? 9.3 : 8.8,
          lineHeight: 1.3,
          fontWeight: 700,
          textAlign: "center",
          wordBreak: "break-word",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {arabicName}
      </Typography>
    </Paper>
  );
}

const managerToColumnsConnectorSx = {
  position: "relative",
  width: 0,
  height: 38,
  borderLeft: `${DETAIL_CONNECTOR_WIDTH} solid ${DETAIL_CONNECTOR_COLOR}`,
  "&::before, &::after": {
    content: '""',
    position: "absolute",
    left: `calc(-${DETAIL_CONNECTOR_DOT_SIZE / 2}px - 1px)`,
    width: DETAIL_CONNECTOR_DOT_SIZE,
    height: DETAIL_CONNECTOR_DOT_SIZE,
    borderRadius: "50%",
    bgcolor: DETAIL_CONNECTOR_COLOR,
    border: "2px solid #ffffff",
    boxSizing: "border-box",
  },
  "&::before": { top: -2 },
  "&::after": { bottom: -2 },
};

const detailColumnsRailSx = {
  position: "relative",
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "center",
  gap: `${DETAIL_COLUMN_GAP}px`,
  pt: "38px",
  width: "max-content",
  "&::before": {
    content: '""',
    position: "absolute",
    top: 0,
    left: DETAIL_COLUMN_WIDTH / 2,
    right: DETAIL_COLUMN_WIDTH / 2,
    borderTop: `${DETAIL_CONNECTOR_WIDTH} solid ${DETAIL_CONNECTOR_COLOR}`,
    borderRadius: 999,
  },
  "&::after": {
    content: '""',
    position: "absolute",
    top: -(DETAIL_CONNECTOR_DOT_SIZE / 2) + 1,
    left: "50%",
    width: DETAIL_CONNECTOR_DOT_SIZE,
    height: DETAIL_CONNECTOR_DOT_SIZE,
    transform: "translateX(-50%)",
    borderRadius: "50%",
    bgcolor: DETAIL_CONNECTOR_COLOR,
    border: "2px solid #ffffff",
    boxSizing: "border-box",
  },
};

const detailColumnSx = {
  position: "relative",
  width: DETAIL_COLUMN_WIDTH,
  minWidth: DETAIL_COLUMN_WIDTH,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: `${DETAIL_LIST_TOP_GAP}px`,
  "&::before": {
    content: '""',
    position: "absolute",
    top: -38,
    left: "50%",
    height: 38,
    borderLeft: `${DETAIL_CONNECTOR_WIDTH} solid ${DETAIL_CONNECTOR_COLOR}`,
  },
  "&::after": {
    content: '""',
    position: "absolute",
    top: -(DETAIL_CONNECTOR_DOT_SIZE / 2),
    left: "50%",
    width: DETAIL_CONNECTOR_DOT_SIZE,
    height: DETAIL_CONNECTOR_DOT_SIZE,
    transform: "translateX(-50%)",
    borderRadius: "50%",
    bgcolor: DETAIL_CONNECTOR_COLOR,
    border: "2px solid #ffffff",
    boxSizing: "border-box",
  },
};

const verticalDetailListSx = {
  position: "relative",
  width: "max-content",
  minWidth: 188,
  listStyle: "none",
  m: 0,
  p: 0,
  pl: 2.6,
  borderLeft: `${DETAIL_CONNECTOR_WIDTH} solid ${DETAIL_CONNECTOR_COLOR}`,
  borderRadius: "0 0 0 8px",
  "&::before": {
    content: '""',
    position: "absolute",
    top: -(DETAIL_CONNECTOR_DOT_SIZE / 2),
    left: `calc(-${DETAIL_CONNECTOR_DOT_SIZE / 2}px - 1px)`,
    width: DETAIL_CONNECTOR_DOT_SIZE,
    height: DETAIL_CONNECTOR_DOT_SIZE,
    borderRadius: "50%",
    bgcolor: DETAIL_CONNECTOR_COLOR,
    border: "2px solid #ffffff",
    boxSizing: "border-box",
  },
};

const verticalDetailItemSx = {
  position: "relative",
  listStyle: "none",
  mb: 0,
  "&::before": {
    content: '""',
    position: "absolute",
    top: DETAIL_CARD_HEIGHT / 2,
    left: -22,
    width: 22,
    borderTop: `${DETAIL_CONNECTOR_WIDTH} solid ${DETAIL_CONNECTOR_COLOR}`,
    borderRadius: 999,
  },
  "&::after": {
    content: '""',
    position: "absolute",
    top: DETAIL_CARD_HEIGHT / 2 - DETAIL_CONNECTOR_DOT_SIZE / 2,
    left: -22 - DETAIL_CONNECTOR_DOT_SIZE / 2 + 1,
    width: DETAIL_CONNECTOR_DOT_SIZE,
    height: DETAIL_CONNECTOR_DOT_SIZE,
    borderRadius: "50%",
    bgcolor: DETAIL_CONNECTOR_COLOR,
    border: "2px solid #ffffff",
    boxSizing: "border-box",
  },
};

const overviewExecutiveStemSx = {
  position: "relative",
  width: 0,
  height: 38,
  borderLeft: `${OVERVIEW_CONNECTOR_WIDTH} solid ${OVERVIEW_CONNECTOR_COLOR}`,
  "&::before, &::after": {
    content: '\"\"',
    position: "absolute",
    left: `calc(-${OVERVIEW_CONNECTOR_DOT_SIZE / 2}px - 1px)`,
    width: OVERVIEW_CONNECTOR_DOT_SIZE,
    height: OVERVIEW_CONNECTOR_DOT_SIZE,
    borderRadius: "50%",
    bgcolor: OVERVIEW_CONNECTOR_COLOR,
    border: "2px solid #ffffff",
    boxSizing: "border-box",
  },
  "&::before": { top: -2 },
  "&::after": { bottom: -2 },
};

const overviewPortfolioRailSx = {
  position: "relative",
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "center",
  gap: `${OVERVIEW_GROUP_GAP}px`,
  width: "max-content",
  pt: "34px",
  "&::before": {
    content: '\"\"',
    position: "absolute",
    top: 0,
    left: OVERVIEW_GROUP_WIDTH / 2,
    right: OVERVIEW_GROUP_WIDTH / 2,
    borderTop: `${OVERVIEW_CONNECTOR_WIDTH} solid ${OVERVIEW_CONNECTOR_COLOR}`,
    borderRadius: 999,
  },
  "&::after": {
    content: '\"\"',
    position: "absolute",
    top: -(OVERVIEW_CONNECTOR_DOT_SIZE / 2) + 1,
    left: "50%",
    width: OVERVIEW_CONNECTOR_DOT_SIZE,
    height: OVERVIEW_CONNECTOR_DOT_SIZE,
    transform: "translateX(-50%)",
    borderRadius: "50%",
    bgcolor: OVERVIEW_CONNECTOR_COLOR,
    border: "2px solid #ffffff",
    boxSizing: "border-box",
  },
};

const overviewPortfolioColumnSx = {
  position: "relative",
  width: OVERVIEW_GROUP_WIDTH,
  minWidth: OVERVIEW_GROUP_WIDTH,
  display: "flex",
  justifyContent: "center",
  "&::before": {
    content: '\"\"',
    position: "absolute",
    top: -34,
    left: "50%",
    height: 34,
    borderLeft: `${OVERVIEW_CONNECTOR_WIDTH} solid ${OVERVIEW_CONNECTOR_COLOR}`,
  },
  "&::after": {
    content: '\"\"',
    position: "absolute",
    top: -(OVERVIEW_CONNECTOR_DOT_SIZE / 2),
    left: "50%",
    width: OVERVIEW_CONNECTOR_DOT_SIZE,
    height: OVERVIEW_CONNECTOR_DOT_SIZE,
    transform: "translateX(-50%)",
    borderRadius: "50%",
    bgcolor: OVERVIEW_CONNECTOR_COLOR,
    border: "2px solid #ffffff",
    boxSizing: "border-box",
  },
};

const overviewPortfolioPanelSx = {
  width: OVERVIEW_GROUP_WIDTH,
  minHeight: 148,
  px: 1.4,
  py: 1.4,
  borderRadius: 2.2,
  border: "1px solid #e3e5f0",
  bgcolor: "#fcfcff",
  boxShadow: "0 4px 14px rgba(47,42,90,0.06)",
};

const overviewManagerStackSx = {
  position: "relative",
  width: "max-content",
  minWidth: 184,
  listStyle: "none",
  m: 0,
  mt: 1.45,
  ml: 1.35,
  p: 0,
  pl: 2.2,
  borderLeft: `${OVERVIEW_CONNECTOR_WIDTH} solid ${OVERVIEW_CONNECTOR_COLOR}`,
  borderRadius: "0 0 0 8px",
};

const overviewManagerStackItemSx = {
  position: "relative",
  listStyle: "none",
  mb: 1.05,
  "&:last-of-type": { mb: 0 },
  "&::before": {
    content: '\"\"',
    position: "absolute",
    top: 32,
    left: -18,
    width: 18,
    borderTop: `${OVERVIEW_CONNECTOR_WIDTH} solid ${OVERVIEW_CONNECTOR_COLOR}`,
    borderRadius: 999,
  },
  "&::after": {
    content: '\"\"',
    position: "absolute",
    top: 32 - OVERVIEW_CONNECTOR_DOT_SIZE / 2,
    left: -18 - OVERVIEW_CONNECTOR_DOT_SIZE / 2 + 1,
    width: OVERVIEW_CONNECTOR_DOT_SIZE,
    height: OVERVIEW_CONNECTOR_DOT_SIZE,
    borderRadius: "50%",
    bgcolor: OVERVIEW_CONNECTOR_COLOR,
    border: "2px solid #ffffff",
    boxSizing: "border-box",
  },
};

const overviewEmptyGroupSx = {
  mt: 1.4,
  px: 1,
  py: 1.1,
  borderRadius: 1.2,
  border: "1px dashed #d1d5e7",
  bgcolor: "#ffffff",
  color: "#787f98",
  fontSize: 9,
  lineHeight: 1.3,
  textAlign: "center",
};

const overviewRootListSx = {
  m: 0,
  p: 0,
  display: "flex",
  justifyContent: "center",
  alignItems: "flex-start",
  listStyle: "none",
};

const overviewTreeItemSx = {
  position: "relative",
  listStyle: "none",
  textAlign: "center",
  px: 1.5,
  "&::before, &::after": {
    content: '\"\"',
    position: "absolute",
    top: -24,
    right: "50%",
    width: "50%",
    height: 24,
    borderTop: `${OVERVIEW_CONNECTOR_WIDTH} solid ${OVERVIEW_CONNECTOR_COLOR}`,
  },
  "&::after": {
    right: "auto",
    left: "50%",
    borderLeft: `${OVERVIEW_CONNECTOR_WIDTH} solid ${OVERVIEW_CONNECTOR_COLOR}`,
  },
  "&:only-child::before, &:only-child::after": { display: "none" },
  "&:first-of-type::before": { border: 0 },
  "&:last-of-type::after": { border: 0 },
  "&:last-of-type::before": {
    borderRight: `${OVERVIEW_CONNECTOR_WIDTH} solid ${OVERVIEW_CONNECTOR_COLOR}`,
    borderRadius: "0 5px 0 0",
  },
};

const overviewChildrenListSx = {
  position: "relative",
  display: "flex",
  justifyContent: "center",
  alignItems: "flex-start",
  listStyle: "none",
  m: 0,
  pt: "24px",
  px: 0,
  "&::before": {
    content: '\"\"',
    position: "absolute",
    top: 0,
    left: "50%",
    height: 24,
    borderLeft: `${OVERVIEW_CONNECTOR_WIDTH} solid ${OVERVIEW_CONNECTOR_COLOR}`,
  },
};

const overviewVerticalTreeItemSx = {
  position: "relative",
  listStyle: "none",
  textAlign: "left",
  px: 0,
};

const overviewVerticalChildrenListSx = {
  position: "relative",
  listStyle: "none",
  m: 0,
  mt: 1.15,
  ml: 2.4,
  pl: 2,
  borderLeft: `${OVERVIEW_CONNECTOR_WIDTH} solid ${OVERVIEW_CONNECTOR_COLOR}`,
  "& > li": { position: "relative", mb: 1.15 },
  "& > li:last-of-type": { mb: 0 },
  "& > li::before": {
    content: '\"\"',
    position: "absolute",
    top: 32,
    left: -16,
    width: 16,
    borderTop: `${OVERVIEW_CONNECTOR_WIDTH} solid ${OVERVIEW_CONNECTOR_COLOR}`,
  },
};

const overviewManagerGroupItemSx = {
  ...overviewTreeItemSx,
  display: "flex",
  justifyContent: "center",
  alignItems: "flex-start",
};

const overviewManagerVerticalListSx = {
  position: "relative",
  listStyle: "none",
  m: 0,
  pt: "24px",
  pl: 2,
  borderLeft: `${OVERVIEW_CONNECTOR_WIDTH} solid ${OVERVIEW_CONNECTOR_COLOR}`,
  "& > li": { position: "relative", mb: 1.1 },
  "& > li:last-of-type": { mb: 0 },
  "& > li::before": {
    content: '\"\"',
    position: "absolute",
    top: 32,
    left: -16,
    width: 16,
    borderTop: `${OVERVIEW_CONNECTOR_WIDTH} solid ${OVERVIEW_CONNECTOR_COLOR}`,
  },
};
