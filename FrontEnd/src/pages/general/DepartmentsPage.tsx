import AccountTreeRoundedIcon from "@mui/icons-material/AccountTreeRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import FileDownloadRoundedIcon from "@mui/icons-material/FileDownloadRounded";
import TableRowsRoundedIcon from "@mui/icons-material/TableRowsRounded";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  Stack,
} from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { departmentsApi } from "../../api/departments.api";
import { DataGridToolbar } from "../../components/DataGridToolbar";
import type { Department } from "../../types/department.types";
import { exportToExcel } from "../../utils/exportExcel";
import {
  DepartmentEditDialog,
  type DepartmentEditTarget,
} from "./DepartmentEditDialog";
import {
  DepartmentHierarchyChart,
  type DepartmentTreeNode,
} from "./DepartmentHierarchyChart";

const ROOT_DEPARTMENT_ID = 1;

const tableContainerSx = {
  bgcolor: "background.paper",
  borderRadius: 2,
  border: 1,
  borderColor: "divider",
  overflow: "hidden",
  height: "calc(100vh - 300px)",
  minHeight: 360,

  "[data-toolpad-color-scheme='light'] &": {
    bgcolor: "#ffffff",
  },
};

const stickyToolbarSx = {
  position: "sticky",
  top: 0,
  zIndex: 5,
  pb: 1,
  bgcolor: "background.default",
};

const dataGridSx = {
  border: "none",
  bgcolor: "background.paper",
  height: "100%",

  "& .MuiDataGrid-columnHeaders": {
    position: "sticky",
    top: 0,
    zIndex: 3,
  },

  "& .MuiDataGrid-columnHeaders, & .MuiDataGrid-footerContainer, & .MuiDataGrid-overlay":
    {
      bgcolor: "background.paper",
    },

  "[data-toolpad-color-scheme='light'] &": {
    bgcolor: "#ffffff",

    "& .MuiDataGrid-columnHeaders, & .MuiDataGrid-footerContainer, & .MuiDataGrid-overlay":
      {
        bgcolor: "#ffffff",
      },
  },
};

type ViewMode = "table" | "hierarchy";

type DepartmentRow = DepartmentEditTarget;

const toRow = (department: Department): DepartmentRow => ({
  id: department.Id,
  departmentNameArabic: department.DepartmentName_Arabic,
  departmentNameEnglish: department.DepartmentName_English,
  departmentType:
    department.DepartmentType && department.DepartmentType.trim()
      ? (department.DepartmentType as DepartmentRow["departmentType"])
      : "Manager",
  attachedNumber: department.AttachedNumber?.toString() ?? "",
  departmentAddress: department.DepartmentAddress,
  departmentPhone: department.DepartmentPhone,
  departmentExtenstion: department.DepartmentExtenstion,
});

const buildDepartmentTree = (
  departments: DepartmentRow[],
): DepartmentTreeNode[] => {
  const nodeMap = new Map<number, DepartmentTreeNode>();
  const roots: DepartmentTreeNode[] = [];

  departments.forEach((department) => {
    const departmentId = Number(department.id);

    if (!Number.isFinite(departmentId)) {
      return;
    }

    nodeMap.set(departmentId, {
      row: department,
      children: [],
    });
  });

  departments.forEach((department) => {
    const departmentId = Number(department.id);
    const currentNode = nodeMap.get(departmentId);

    if (!currentNode) {
      return;
    }

    const attachedNumberValue = department.attachedNumber;
    const parentId = Number(attachedNumberValue);

    const isRoot =
      attachedNumberValue === "" ||
      attachedNumberValue === null ||
      attachedNumberValue === undefined ||
      !Number.isFinite(parentId) ||
      parentId === 0 ||
      parentId === departmentId;

    if (isRoot) {
      roots.push(currentNode);
      return;
    }

    const parentNode = nodeMap.get(parentId);

    if (parentNode) {
      parentNode.children.push(currentNode);
    } else {
      roots.push(currentNode);
    }
  });

  const sortNodes = (nodes: DepartmentTreeNode[]) => {
    nodes.sort((first, second) => {
      return Number(first.row.id) - Number(second.row.id);
    });

    nodes.forEach((node) => {
      sortNodes(node.children);
    });
  };

  sortNodes(roots);

  return roots;
};

const findDepartmentNode = (
  nodes: DepartmentTreeNode[],
  departmentId: number,
): DepartmentTreeNode | null => {
  for (const node of nodes) {
    if (Number(node.row.id) === departmentId) {
      return node;
    }

    const foundNode = findDepartmentNode(
      node.children,
      departmentId,
    );

    if (foundNode) {
      return foundNode;
    }
  }

  return null;
};

const filterDepartmentTree = (
  nodes: DepartmentTreeNode[],
  searchValue: string,
): DepartmentTreeNode[] => {
  const normalizedSearch = searchValue.trim().toLowerCase();

  if (!normalizedSearch) {
    return nodes;
  }

  return nodes.reduce<DepartmentTreeNode[]>(
    (result, node) => {
      const searchableText = [
        node.row.id,
        node.row.departmentNameEnglish,
        node.row.departmentNameArabic,
        node.row.departmentAddress,
        node.row.departmentPhone,
        node.row.departmentExtenstion,
      ]
        .filter(
          (value) =>
            value !== null &&
            value !== undefined &&
            value !== "",
        )
        .join(" ")
        .toLowerCase();

      const filteredChildren = filterDepartmentTree(
        node.children,
        normalizedSearch,
      );

      const currentNodeMatches =
        searchableText.includes(normalizedSearch);

      if (currentNodeMatches || filteredChildren.length > 0) {
        result.push({
          row: node.row,
          children: currentNodeMatches
            ? node.children
            : filteredChildren,
        });
      }

      return result;
    },
    [],
  );
};

export default function DepartmentsPage() {
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<DepartmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [viewMode, setViewMode] =
    useState<ViewMode>("hierarchy");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] =
    useState<"create" | "edit">("edit");
  const [editTarget, setEditTarget] =
    useState<DepartmentRow | null>(null);

  const openCreateDialog = () => {
    setDialogMode("create");
    setEditTarget(null);
    setDialogOpen(true);
  };

  const openEditDialog = (row: DepartmentRow) => {
    setDialogMode("edit");
    setEditTarget(row);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditTarget(null);
  };

  const loadDepartments = useCallback(
    async (
      searchValue: string,
      mode: ViewMode,
      options?: { keepVisible?: boolean },
    ) => {
      if (options?.keepVisible) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        /*
         * In hierarchy mode, load all departments.
         * This is necessary because filtering in the API could remove
         * parent rows and break the organizational hierarchy.
         */
        const requestParameters =
          mode === "table" && searchValue.trim()
            ? {
                search: searchValue.trim(),
              }
            : undefined;

        const response =
          await departmentsApi.list(requestParameters);

        if (!response.success) {
          setError(
            response.message ||
              "Failed to load departments",
          );
          setRows([]);
          return;
        }

        setRows(response.data.map(toRow));
      } catch (loadError) {
        console.error(
          "Failed to load departments:",
          loadError,
        );

        setError("Failed to load departments");
        setRows([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadDepartments(search, viewMode);
    }, 300);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadDepartments, search, viewMode]);

  const completeHierarchy = useMemo(() => {
    return buildDepartmentTree(rows);
  }, [rows]);

  /*
   * Start the hierarchy from department ID = 1.
   *
   * It displays:
   * ID 1
   *   children where AttachedNumber = 1
   *     children of those departments
   *       etc.
   */
  const hierarchyRoots = useMemo(() => {
    const rootDepartment = findDepartmentNode(
      completeHierarchy,
      ROOT_DEPARTMENT_ID,
    );

    if (rootDepartment) {
      return [rootDepartment];
    }

    /*
     * Fallback:
     * If ID 1 is not available, show all detected roots.
     */
    return completeHierarchy;
  }, [completeHierarchy]);

  const visibleHierarchy = useMemo(() => {
    return filterDepartmentTree(hierarchyRoots, search);
  }, [hierarchyRoots, search]);

  const handleToggleView = () => {
    setViewMode((currentMode) =>
      currentMode === "table"
        ? "hierarchy"
        : "table",
    );
  };

  const handleExport = () => {
    exportToExcel(
      "departments",
      [
        {
          header: "ID",
          value: (row) => row.id,
        },
        {
          header: "Department Name (EN)",
          value: (row) =>
            row.departmentNameEnglish,
        },
        {
          header: "Department Name (AR)",
          value: (row) =>
            row.departmentNameArabic,
        },
        {
          header: "Department Type",
          value: (row) => row.departmentType,
        },
        {
          header: "Reports To",
          value: (row) => {
            const parentId = Number(row.attachedNumber);
            if (!row.attachedNumber || !Number.isFinite(parentId)) {
              return "";
            }

            const parent = rows.find((item) => item.id === parentId);
            return parent?.departmentNameEnglish || row.attachedNumber;
          },
        },
        {
          header: "Address",
          value: (row) => row.departmentAddress,
        },
        {
          header: "Phone",
          value: (row) => row.departmentPhone,
        },
        {
          header: "Extension",
          value: (row) =>
            row.departmentExtenstion,
        },
      ],
      rows,
    );
  };

  const columns = useMemo<GridColDef<DepartmentRow>[]>(
    () => [
      {
        field: "id",
        headerName: "ID",
        width: 90,
      },
      {
        field: "departmentNameEnglish",
        headerName: "Department Name (EN)",
        minWidth: 180,
        flex: 1,
      },
      {
        field: "departmentNameArabic",
        headerName: "Department Name (AR)",
        minWidth: 180,
        flex: 1,
      },
      {
        field: "departmentType",
        headerName: "Department Type",
        minWidth: 160,
      },
      {
        field: "attachedNumber",
        headerName: "Reports To",
        minWidth: 200,
        flex: 1,
        valueGetter: (_value, row) => {
          const parentId = Number(row.attachedNumber);
          if (!row.attachedNumber || !Number.isFinite(parentId)) {
            return "";
          }

          const parent = rows.find((item) => item.id === parentId);
          return parent?.departmentNameEnglish || row.attachedNumber;
        },
      },
      {
        field: "departmentAddress",
        headerName: "Address",
        minWidth: 180,
        flex: 1,
      },
      {
        field: "departmentPhone",
        headerName: "Phone",
        minWidth: 140,
      },
      {
        field: "departmentExtenstion",
        headerName: "Extension",
        minWidth: 120,
      },
      {
        field: "actions",
        headerName: "Actions",
        width: 100,
        sortable: false,
        filterable: false,

        renderCell: (params) => (
          <IconButton
            size="small"
            aria-label="Edit department"
            onClick={() =>
              openEditDialog(params.row)
            }
          >
            <EditRoundedIcon fontSize="small" />
          </IconButton>
        ),
      },
    ],
    [rows],
  );

  return (
    <Box>
      <Box sx={stickyToolbarSx}>
        <DataGridToolbar
          search={search}
          onSearchChange={setSearch}
          actions={
            <Stack
              direction="row"
              spacing={1}
              flexWrap="wrap"
              useFlexGap
            >
              <Button
                variant={
                  viewMode === "hierarchy"
                    ? "contained"
                    : "outlined"
                }
                color="secondary"
                startIcon={
                  viewMode === "table" ? (
                    <AccountTreeRoundedIcon />
                  ) : (
                    <TableRowsRoundedIcon />
                  )
                }
                onClick={handleToggleView}
              >
                {viewMode === "table"
                  ? "Show Hierarchy"
                  : "Show Table"}
              </Button>

              <Button
                variant="contained"
                startIcon={<AddRoundedIcon />}
                onClick={openCreateDialog}
              >
                New Department
              </Button>

              <Button
                variant="outlined"
                startIcon={
                  <FileDownloadRoundedIcon />
                }
                onClick={handleExport}
                disabled={
                  loading || rows.length === 0
                }
              >
                Export to Excel
              </Button>
            </Stack>
          }
        />
      </Box>

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}

      {loading ? (
        <Box
          display="flex"
          alignItems="center"
          justifyContent="center"
          sx={tableContainerSx}
        >
          <CircularProgress size={32} />
        </Box>
      ) : viewMode === "table" ? (
        <Box sx={tableContainerSx}>
          <DataGrid
            rows={rows}
            columns={columns}
            pageSizeOptions={[10, 20, 50]}
            disableRowSelectionOnClick
            sx={dataGridSx}
          />
        </Box>
      ) : visibleHierarchy.length === 0 ? (
        <Alert severity="info">
          No departments were found.
        </Alert>
      ) : (
        <DepartmentHierarchyChart
          nodes={visibleHierarchy}
          onEdit={openEditDialog}
          refreshing={refreshing}
          onRefresh={() => {
            void loadDepartments(search, viewMode, {
              keepVisible: true,
            });
          }}
        />
      )}

      <DepartmentEditDialog
        open={dialogOpen}
        mode={dialogMode}
        department={editTarget}
        onClose={closeDialog}
        onSaved={() => {
          closeDialog();
          void loadDepartments(search, viewMode);
        }}
      />
    </Box>
  );
}