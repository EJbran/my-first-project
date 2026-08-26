export const EMPLOYEE_DATA_ISSUE_OPTIONS = [
  { value: "job", label: "Missing job" },
  { value: "department", label: "Missing department" },
  { value: "workLocation", label: "Missing work location" },
  { value: "dateOfBirth", label: "Missing date of birth" },
  { value: "placeOfBirth", label: "Missing place of birth" },
  { value: "familyBookIssuer", label: "Missing Family Book Issuer" },
  { value: "nationality", label: "Missing nationality" },
  { value: "contractStart", label: "Missing contract start" },
  { value: "gender", label: "Missing gender" },
  { value: "invalid-gender", label: "Invalid gender" },
  { value: "activeExpiredContract", label: "Active with expired contract" },
  { value: "contractChronology", label: "Contract end before start" }
] as const;

const DATA_ISSUE_LABELS = new Map<string, string>(
  EMPLOYEE_DATA_ISSUE_OPTIONS.map((option) => [option.value, option.label])
);

export const getEmployeeDataIssueLabel = (value: string): string =>
  DATA_ISSUE_LABELS.get(value)
  ?? value
    .replace(/-/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (character) => character.toUpperCase());
