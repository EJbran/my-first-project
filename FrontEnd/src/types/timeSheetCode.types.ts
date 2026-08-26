export interface TimeSheetCode {
  ID: number;
  Code_Description: string | null;
  Code: string | null;
}

export interface TimeSheetCodePayload {
  Code_Description?: string | null;
  Code?: string | null;
}
