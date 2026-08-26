import BusinessCenterOutlinedIcon from "@mui/icons-material/BusinessCenterOutlined";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import FilterAltRoundedIcon from "@mui/icons-material/FilterAltRounded";
import ManageSearchRoundedIcon from "@mui/icons-material/ManageSearchRounded";
import PersonOutlineRoundedIcon from "@mui/icons-material/PersonOutlineRounded";
import RuleRoundedIcon from "@mui/icons-material/RuleRounded";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
  useMediaQuery
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import type {
  EmployeeSearchFilters,
  EmployeeSearchOption,
  EmployeeSearchOptions
} from "../../../types/employee.types";
import { EMPLOYEE_DATA_ISSUE_OPTIONS } from "./employeeSearchFilterOptions";
import { getHrThemeVars } from "../jobs/Theme";

interface EmployeeSearchDialogProps {
  open: boolean;
  initialFilters: EmployeeSearchFilters;
  options?: EmployeeSearchOptions;
  optionsLoading?: boolean;
  optionsError?: string | null;
  onClose: () => void;
  onApply: (filters: EmployeeSearchFilters) => void;
  onShowAll: () => void;
}

type EmployeeSearchDraft = {
  search: string;
  employeeNumber: string;
  status: string;
  departmentId: string;
  locationId: string;
  jobId: string;
  gender: string;
  nationality: string;
  employeeType: string;
  contractType: string;
  placeOfBirth: string;
  familyBookIssuer: string;
  ageBand: string;
  ageMin: string;
  ageMax: string;
  contractStartFrom: string;
  contractStartTo: string;
  contractEndFrom: string;
  contractEndTo: string;
  contractRisk: string;
  seniorityMilestone: string;
  missingField: string;
};

interface FilterSectionProps {
  title: string;
  description: string;
  icon: ReactNode;
  children: ReactNode;
  wide?: boolean;
}

interface OptionFieldProps {
  label: string;
  placeholder: string;
  value: string;
  options: EmployeeSearchOption[];
  loading?: boolean;
  onChange: (value: string) => void;
}

const EMPTY_DRAFT: EmployeeSearchDraft = {
  search: "",
  employeeNumber: "",
  status: "",
  departmentId: "",
  locationId: "",
  jobId: "",
  gender: "",
  nationality: "",
  employeeType: "",
  contractType: "",
  placeOfBirth: "",
  familyBookIssuer: "",
  ageBand: "",
  ageMin: "",
  ageMax: "",
  contractStartFrom: "",
  contractStartTo: "",
  contractEndFrom: "",
  contractEndTo: "",
  contractRisk: "",
  seniorityMilestone: "",
  missingField: ""
};

const EMPTY_OPTIONS: EmployeeSearchOptions = {
  jobs: [],
  departments: [],
  workLocations: [],
  genders: [],
  nationalities: [],
  employeeTypes: [],
  contractTypes: [],
  placesOfBirth: [],
  familyBookIssuers: []
};

const SEARCH_DIALOG_TITLE_ID = "employee-search-dialog-title";
const SEARCH_DIALOG_DESCRIPTION_ID = "employee-search-dialog-description";

const cleanText = (value: string): string | undefined => value.trim() || undefined;

const filtersToDraft = (filters: EmployeeSearchFilters): EmployeeSearchDraft => ({
  ...EMPTY_DRAFT,
  search: filters.search ?? "",
  employeeNumber: filters.employeeNumber ?? "",
  status: filters.status ?? "",
  departmentId: filters.departmentId ?? "",
  locationId: filters.locationId ?? "",
  jobId: filters.jobId ?? "",
  gender: filters.gender ?? "",
  nationality: filters.nationality ?? "",
  employeeType: filters.employeeType ?? "",
  contractType: filters.contractType ?? "",
  placeOfBirth: filters.placeOfBirth ?? "",
  familyBookIssuer: filters.familyBookIssuer ?? "",
  ageBand: filters.ageBand ?? "",
  ageMin: filters.ageMin === undefined ? "" : String(filters.ageMin),
  ageMax: filters.ageMax === undefined ? "" : String(filters.ageMax),
  contractStartFrom: filters.contractStartFrom ?? "",
  contractStartTo: filters.contractStartTo ?? "",
  contractEndFrom: filters.contractEndFrom ?? "",
  contractEndTo: filters.contractEndTo ?? "",
  contractRisk: filters.contractRisk ?? "",
  seniorityMilestone: filters.seniorityMilestone ?? "",
  missingField: filters.missingField ?? ""
});

const draftToFilters = (draft: EmployeeSearchDraft): EmployeeSearchFilters => {
  const ageMin = draft.ageMin === "" ? undefined : Number(draft.ageMin);
  const ageMax = draft.ageMax === "" ? undefined : Number(draft.ageMax);

  return {
    search: cleanText(draft.search),
    employeeNumber: cleanText(draft.employeeNumber),
    status: cleanText(draft.status),
    departmentId: cleanText(draft.departmentId),
    locationId: cleanText(draft.locationId),
    jobId: cleanText(draft.jobId),
    gender: cleanText(draft.gender),
    nationality: cleanText(draft.nationality),
    employeeType: cleanText(draft.employeeType),
    contractType: cleanText(draft.contractType),
    placeOfBirth: cleanText(draft.placeOfBirth),
    familyBookIssuer: cleanText(draft.familyBookIssuer),
    ageBand: cleanText(draft.ageBand),
    ageMin: Number.isFinite(ageMin) ? ageMin : undefined,
    ageMax: Number.isFinite(ageMax) ? ageMax : undefined,
    contractStartFrom: cleanText(draft.contractStartFrom),
    contractStartTo: cleanText(draft.contractStartTo),
    contractEndFrom: cleanText(draft.contractEndFrom),
    contractEndTo: cleanText(draft.contractEndTo),
    contractRisk: cleanText(draft.contractRisk),
    seniorityMilestone: cleanText(draft.seniorityMilestone),
    missingField: cleanText(draft.missingField)
  };
};

const FilterSection = ({ title, description, icon, children, wide = false }: FilterSectionProps) => (
  <Box
    component="section"
    sx={{
      minWidth: 0,
      gridColumn: { lg: wide ? "1 / -1" : "auto" },
      p: { xs: 2, md: 2.25 },
      border: "1px solid var(--hr-border)",
      borderRadius: "12px",
      bgcolor: "var(--hr-surface)"
    }}
  >
    <Stack direction="row" spacing={1.25} alignItems="flex-start" sx={{ mb: 2 }}>
      <Box
        aria-hidden="true"
        sx={{
          width: 36,
          height: 36,
          flex: "0 0 auto",
          display: "grid",
          placeItems: "center",
          borderRadius: "9px",
          color: "var(--hr-accent)",
          bgcolor: "var(--hr-selected)",
          "& .MuiSvgIcon-root": { fontSize: 20 }
        }}
      >
        {icon}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ color: "var(--hr-text)", fontSize: 15, lineHeight: 1.3, fontWeight: 800 }}>
          {title}
        </Typography>
        <Typography sx={{ mt: 0.25, color: "var(--hr-muted)", fontSize: 12, lineHeight: 1.45 }}>
          {description}
        </Typography>
      </Box>
    </Stack>
    {children}
  </Box>
);

const OptionField = ({ label, placeholder, value, options, loading, onChange }: OptionFieldProps) => {
  const selectedOption = options.find((option) => option.value === value) ?? null;

  return (
    <Autocomplete
      size="small"
      options={options}
      value={selectedOption}
      loading={loading}
      getOptionLabel={(option) => option.label}
      isOptionEqualToValue={(option, selected) => option.value === selected.value}
      onChange={(_event, option) => onChange(option?.value ?? "")}
      renderInput={(params) => <TextField {...params} label={label} placeholder={placeholder} />}
    />
  );
};

export const EmployeeSearchDialog = ({
  open,
  initialFilters,
  options = EMPTY_OPTIONS,
  optionsLoading = false,
  optionsError = null,
  onClose,
  onApply,
  onShowAll
}: EmployeeSearchDialogProps) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const [draft, setDraft] = useState<EmployeeSearchDraft>(() => filtersToDraft(initialFilters));

  useEffect(() => {
    if (open) setDraft(filtersToDraft(initialFilters));
  }, [initialFilters, open]);

  const activeFilterCount = useMemo(
    () => Object.values(draft).filter((value) => value.trim() !== "").length,
    [draft]
  );
  const departmentOptions = useMemo(
    () => (options.departments ?? []).some((option) => option.value === "unassigned")
      ? options.departments
      : [{ value: "unassigned", label: "Unassigned department" }, ...(options.departments ?? [])],
    [options.departments]
  );
  const validationError = useMemo(() => {
    if (draft.ageMin !== "" && draft.ageMax !== "" && Number(draft.ageMin) > Number(draft.ageMax)) {
      return "Minimum age cannot be greater than maximum age.";
    }
    if (draft.contractStartFrom && draft.contractStartTo && draft.contractStartFrom > draft.contractStartTo) {
      return "Contract start-from date cannot be after the start-to date.";
    }
    if (draft.contractEndFrom && draft.contractEndTo && draft.contractEndFrom > draft.contractEndTo) {
      return "Contract end-from date cannot be after the end-to date.";
    }
    return null;
  }, [draft]);

  const updateDraft = (key: keyof EmployeeSearchDraft) => (value: string) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const fieldGridSx = {
    display: "grid",
    gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" },
    gap: 1.5
  } as const;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen={fullScreen}
      fullWidth
      maxWidth="lg"
      scroll="paper"
      aria-labelledby={SEARCH_DIALOG_TITLE_ID}
      aria-describedby={SEARCH_DIALOG_DESCRIPTION_ID}
      sx={(dialogTheme) => ({
        ...getHrThemeVars(dialogTheme),
        "& .MuiDialog-paper": {
          width: { sm: "calc(100% - 32px)", lg: 1120 },
          maxWidth: 1120,
          maxHeight: { sm: "calc(100dvh - 32px)" },
          m: { xs: 0, sm: 2 },
          overflow: "hidden",
          border: { sm: "1px solid var(--hr-border)" },
          borderRadius: { xs: 0, sm: "14px" },
          bgcolor: "var(--hr-surface)",
          boxShadow: "0 24px 70px rgba(7, 28, 89, 0.22)"
        }
      })}
    >
      <Box
        id="employee-search-filter-form"
        component="form"
        onSubmit={(event) => {
          event.preventDefault();
          if (validationError) return;
          onApply(draftToFilters(draft));
        }}
        sx={{ display: "flex", minHeight: 0, flex: 1, flexDirection: "column" }}
      >
        <DialogTitle
          component="div"
          sx={{ px: { xs: 2, md: 3 }, py: { xs: 1.75, md: 2.25 }, borderBottom: "1px solid var(--hr-border)" }}
        >
          <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
            <Stack direction="row" alignItems="center" spacing={1.4} sx={{ minWidth: 0 }}>
              <Box
                aria-hidden="true"
                sx={{
                  width: 44,
                  height: 44,
                  flex: "0 0 auto",
                  display: "grid",
                  placeItems: "center",
                  borderRadius: "11px",
                  color: "var(--hr-accent)",
                  bgcolor: "var(--hr-selected)"
                }}
              >
                <FilterAltRoundedIcon />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography id={SEARCH_DIALOG_TITLE_ID} sx={{ color: "var(--hr-text)", fontSize: { xs: 19, md: 22 }, lineHeight: 1.25, fontWeight: 850 }}>
                  Filter employees
                </Typography>
                <Typography id={SEARCH_DIALOG_DESCRIPTION_ID} sx={{ mt: 0.35, color: "var(--hr-muted)", fontSize: 12.5, lineHeight: 1.4 }}>
                  Choose one or more filters, then search the employee directory.
                </Typography>
              </Box>
            </Stack>
            <IconButton aria-label="Close employee filters" onClick={onClose} sx={{ color: "var(--hr-strong-muted)" }}>
              <CloseRoundedIcon />
            </IconButton>
          </Stack>
        </DialogTitle>

        <DialogContent sx={{ minHeight: 0, p: { xs: 2, md: 3 }, bgcolor: "var(--hr-surface-soft)" }}>
          {optionsError ? (
            <Alert severity="warning" sx={{ mb: 2 }}>
              Some filter choices could not be loaded. Quick search, status, age, date, and data-quality filters are still available.
            </Alert>
          ) : null}
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "repeat(2, minmax(0, 1fr))" }, gap: 2 }}>
            <FilterSection
              title="Quick search"
              description="Search names in Arabic or English, employee ID, email, department, job, or work location."
              icon={<ManageSearchRoundedIcon />}
              wide
            >
              <TextField
                autoFocus
                fullWidth
                size="small"
                label="Search employees"
                placeholder="Name, employee ID, email, department, job, or work location"
                value={draft.search}
                onChange={(event) => updateDraft("search")(event.target.value)}
              />
            </FilterSection>

            <FilterSection
              title="Employment"
              description="Narrow results by status and employment arrangement."
              icon={<BusinessCenterOutlinedIcon />}
            >
              <Box sx={fieldGridSx}>
                <TextField select size="small" label="Employment status" value={draft.status} onChange={(event) => updateDraft("status")(event.target.value)}>
                  <MenuItem value="">Any status</MenuItem>
                  <MenuItem value="employee">All employee records (excluding vacancies)</MenuItem>
                  <MenuItem value="current">Current (active and on leave)</MenuItem>
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="on-leave">On Leave</MenuItem>
                  <MenuItem value="archived">Archived</MenuItem>
                  <MenuItem value="vacancy">Vacancy</MenuItem>
                  <MenuItem value="unknown">Unknown</MenuItem>
                </TextField>
                <TextField size="small" label="Employee number" value={draft.employeeNumber} onChange={(event) => updateDraft("employeeNumber")(event.target.value)} />
                <OptionField label="Employee type" placeholder="Any employee type" value={draft.employeeType} options={options.employeeTypes} loading={optionsLoading} onChange={updateDraft("employeeType")} />
                <OptionField label="Contract type" placeholder="Any contract type" value={draft.contractType} options={options.contractTypes} loading={optionsLoading} onChange={updateDraft("contractType")} />
              </Box>
            </FilterSection>

            <FilterSection
              title="Organization"
              description="Find employees by their linked department, work location, or assigned job."
              icon={<BusinessCenterOutlinedIcon />}
            >
              <Box sx={fieldGridSx}>
                <OptionField label="Department" placeholder="Any department" value={draft.departmentId} options={departmentOptions} loading={optionsLoading} onChange={updateDraft("departmentId")} />
                <OptionField label="Work location" placeholder="Any work location" value={draft.locationId} options={options.workLocations} loading={optionsLoading} onChange={updateDraft("locationId")} />
                <Box sx={{ gridColumn: { md: "1 / -1" } }}>
                  <OptionField label="Job" placeholder="Any job" value={draft.jobId} options={options.jobs} loading={optionsLoading} onChange={updateDraft("jobId")} />
                </Box>
              </Box>
            </FilterSection>

            <FilterSection
              title="Personal"
              description="Use personal and civil-record information to refine the result."
              icon={<PersonOutlineRoundedIcon />}
            >
              <Box sx={fieldGridSx}>
                <TextField select size="small" label="Gender" value={draft.gender} onChange={(event) => updateDraft("gender")(event.target.value)}>
                  <MenuItem value="">Any gender</MenuItem>
                  {options.genders.map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
                </TextField>
                <OptionField label="Nationality" placeholder="Any nationality" value={draft.nationality} options={options.nationalities} loading={optionsLoading} onChange={updateDraft("nationality")} />
                <TextField select size="small" label="Age band" value={draft.ageBand} onChange={(event) => updateDraft("ageBand")(event.target.value)}>
                  <MenuItem value="">Any age band</MenuItem>
                  <MenuItem value="under-25">Under 25</MenuItem>
                  <MenuItem value="25-34">25–34</MenuItem>
                  <MenuItem value="35-44">35–44</MenuItem>
                  <MenuItem value="45-54">45–54</MenuItem>
                  <MenuItem value="55-plus">55+</MenuItem>
                  <MenuItem value="unknown">Unknown age</MenuItem>
                </TextField>
                <TextField size="small" type="number" label="Minimum age" value={draft.ageMin} inputProps={{ min: 0, max: 100 }} onChange={(event) => updateDraft("ageMin")(event.target.value)} />
                <TextField size="small" type="number" label="Maximum age" value={draft.ageMax} inputProps={{ min: 0, max: 100 }} onChange={(event) => updateDraft("ageMax")(event.target.value)} />
                <OptionField label="Place of birth" placeholder="Any place of birth" value={draft.placeOfBirth} options={options.placesOfBirth} loading={optionsLoading} onChange={updateDraft("placeOfBirth")} />
                <OptionField label="Family Book Issuer" placeholder="Any issuer" value={draft.familyBookIssuer} options={options.familyBookIssuers} loading={optionsLoading} onChange={updateDraft("familyBookIssuer")} />
              </Box>
            </FilterSection>

            <FilterSection
              title="Service & data"
            description="Filter contract dates, seniority milestones, and data quality issues."
              icon={<RuleRoundedIcon />}
            >
              <Box sx={fieldGridSx}>
                <TextField select size="small" label="Contract status" value={draft.contractRisk} onChange={(event) => updateDraft("contractRisk")(event.target.value)}>
                  <MenuItem value="">Any contract status</MenuItem>
                  <MenuItem value="expired">Expired</MenuItem>
                  <MenuItem value="within-30">Due in 0–30 days</MenuItem>
                  <MenuItem value="within-60">Due in 31–60 days</MenuItem>
                  <MenuItem value="within-90">Due in 61–90 days</MenuItem>
                  <MenuItem value="no-end-date">No end date</MenuItem>
                </TextField>
                <TextField select size="small" label="Seniority milestone" value={draft.seniorityMilestone} onChange={(event) => updateDraft("seniorityMilestone")(event.target.value)}>
                  <MenuItem value="">Any milestone</MenuItem>
                  {[5, 10, 15, 20, 25, 30, 35, 40, 45, 50].map((years) => <MenuItem key={years} value={String(years)}>{years} years</MenuItem>)}
                </TextField>
                <TextField select size="small" label="Data quality issue" value={draft.missingField} onChange={(event) => updateDraft("missingField")(event.target.value)} sx={{ gridColumn: { md: "1 / -1" } }}>
                  <MenuItem value="">Any data issue</MenuItem>
                  {EMPLOYEE_DATA_ISSUE_OPTIONS.map((option) => (
                    <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                  ))}
                </TextField>
                <TextField size="small" type="date" label="Contract start from" value={draft.contractStartFrom} InputLabelProps={{ shrink: true }} onChange={(event) => updateDraft("contractStartFrom")(event.target.value)} />
                <TextField size="small" type="date" label="Contract start to" value={draft.contractStartTo} InputLabelProps={{ shrink: true }} onChange={(event) => updateDraft("contractStartTo")(event.target.value)} />
                <TextField size="small" type="date" label="Contract end from" value={draft.contractEndFrom} InputLabelProps={{ shrink: true }} onChange={(event) => updateDraft("contractEndFrom")(event.target.value)} />
                <TextField size="small" type="date" label="Contract end to" value={draft.contractEndTo} InputLabelProps={{ shrink: true }} onChange={(event) => updateDraft("contractEndTo")(event.target.value)} />
              </Box>
            </FilterSection>
          </Box>
        </DialogContent>

        <DialogActions
          sx={{
            px: { xs: 2, md: 3 },
            py: 1.5,
            gap: 1,
            flexWrap: "wrap",
            borderTop: "1px solid var(--hr-border)",
            bgcolor: "var(--hr-surface)"
          }}
        >
          <Typography
            aria-live="polite"
            sx={{ mr: "auto", color: validationError ? "error.main" : "var(--hr-muted)", fontSize: 12.5, fontWeight: validationError ? 700 : 400 }}
          >
            {validationError
              ?? (activeFilterCount === 0 ? "No filters selected" : `${activeFilterCount} ${activeFilterCount === 1 ? "filter" : "filters"} selected`)}
          </Typography>
          <Button onClick={() => setDraft(EMPTY_DRAFT)} disabled={activeFilterCount === 0} sx={{ textTransform: "none", fontWeight: 700 }}>
            Clear all
          </Button>
          <Button onClick={onClose} sx={{ textTransform: "none", fontWeight: 700 }}>Cancel</Button>
          <Button variant="outlined" onClick={onShowAll} sx={{ textTransform: "none", fontWeight: 750 }}>
            Browse all employees
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={activeFilterCount === 0 || Boolean(validationError)}
            sx={{ minWidth: 150, textTransform: "none", fontWeight: 800 }}
          >
            Search employees
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
};
