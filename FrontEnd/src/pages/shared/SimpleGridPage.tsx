import { Alert, Box, Button, Card, MenuItem, Stack, TextField } from "@mui/material";
import { DataGrid, type GridColDef, type GridPaginationModel } from "@mui/x-data-grid";
import { useMemo, useState } from "react";
import { PageHeader } from "../../components/PageHeader";

export interface SimpleRow {
  id: string | number;
  [key: string]: string | number | boolean | null | undefined;
}

interface FilterConfig {
  key: string;
  label: string;
  type?: "text" | "select" | "date";
  options?: Array<{ label: string; value: string }>;
}

interface SimpleGridPageProps {
  title: string;
  subtitle: string;
  columns: GridColDef<SimpleRow>[];
  rows?: SimpleRow[];
  filters?: FilterConfig[];
  helperText?: string;
  action?: { label: string; onClick: () => void };
}

export const SimpleGridPage = ({
  title,
  subtitle,
  columns,
  rows = [],
  filters = [],
  helperText,
  action
}: SimpleGridPageProps) => {
  const [pageModel, setPageModel] = useState<GridPaginationModel>({ page: 0, pageSize: 10 });

  const filterDefaults = useMemo(
    () => filters.reduce<Record<string, string>>((acc, item) => ({ ...acc, [item.key]: "" }), {}),
    [filters]
  );
  const [filterValues, setFilterValues] = useState<Record<string, string>>(filterDefaults);

  return (
    <Stack gap={2}>
      <PageHeader
        title={title}
        subtitle={subtitle}
        action={
          action ? (
            <Button variant="contained" onClick={action.onClick}>
              {action.label}
            </Button>
          ) : undefined
        }
      />
      {helperText ? <Alert severity="info">{helperText}</Alert> : null}
      {filters.length > 0 ? (
        <Card sx={{ p: 2 }}>
          <Box display="grid" gap={2} gridTemplateColumns={{ xs: "1fr", md: "repeat(4, minmax(0, 1fr))" }}>
            {filters.map((filter) => {
              const value = filterValues[filter.key] ?? "";
              if (filter.type === "select") {
                return (
                  <TextField
                    key={filter.key}
                    label={filter.label}
                    size="small"
                    select
                    value={value}
                    onChange={(event) =>
                      setFilterValues((prev) => ({
                        ...prev,
                        [filter.key]: event.target.value
                      }))
                    }
                  >
                    <MenuItem value="">All</MenuItem>
                    {(filter.options ?? []).map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </TextField>
                );
              }

              return (
                <TextField
                  key={filter.key}
                  type={filter.type === "date" ? "date" : "text"}
                  label={filter.label}
                  size="small"
                  value={value}
                  onChange={(event) =>
                    setFilterValues((prev) => ({
                      ...prev,
                      [filter.key]: event.target.value
                    }))
                  }
                  InputLabelProps={filter.type === "date" ? { shrink: true } : undefined}
                />
              );
            })}
          </Box>
        </Card>
      ) : null}
      <Card sx={{ p: 1 }}>
        <DataGrid
          autoHeight
          rows={rows}
          columns={columns}
          pageSizeOptions={[10, 20, 50]}
          paginationMode="server"
          rowCount={rows.length}
          paginationModel={pageModel}
          onPaginationModelChange={setPageModel}
          disableRowSelectionOnClick
        />
      </Card>
    </Stack>
  );
};
