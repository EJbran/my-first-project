import dayjs from "dayjs";

export const formatDateTime = (value?: string): string => {
  if (!value) return "-";
  return dayjs(value).format("YYYY-MM-DD HH:mm");
};

export const formatDate = (value?: string): string => {
  if (!value) return "-";
  return dayjs(value).format("YYYY-MM-DD");
};
