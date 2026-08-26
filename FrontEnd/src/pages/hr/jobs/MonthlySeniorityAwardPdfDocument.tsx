import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import { Box, Typography } from "@mui/material";
import type {
  MonthlySeniorityAwardReport,
  SeniorityAwardLineStatus,
  SeniorityAwardReportLine
} from "../../../types/hrReports.types";

type MonthlySeniorityAwardPdfDocumentProps = {
  report: MonthlySeniorityAwardReport;
  logoId: string;
};

const NAVY = "#031c68";
const RED = "#e00e14";
const GREEN = "#087a43";
const AMBER = "#b86800";
const BORDER = "#8893a6";
const TEXT = "#182033";
const FONT_STACK = "Arial, Tahoma, sans-serif";
const FIRST_PAGE_ROWS = 8;
const CONTINUATION_PAGE_ROWS = 14;
const CONTROL_PAGE_ROWS = 10;

const moneyFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 3,
  maximumFractionDigits: 3
});

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "UTC"
});

const formatDate = (value?: string | null): string => {
  if (!value) return "-";
  const date = new Date(`${value.slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date).replaceAll("/", "-");
};

const formatDateTime = (value?: string | null): string => {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
      }).format(date).replaceAll("/", "-");
};

const statusLabel = (status: SeniorityAwardLineStatus): string => {
  if (status === "eligible") return "Eligible";
  if (status === "held") return "Held";
  return "Review";
};

const statusColor = (status: SeniorityAwardLineStatus): string => {
  if (status === "eligible") return GREEN;
  if (status === "held") return RED;
  return AMBER;
};

const splitIntoPages = (items: SeniorityAwardReportLine[]): SeniorityAwardReportLine[][] => {
  if (items.length === 0) return [[]];

  const pages: SeniorityAwardReportLine[][] = [items.slice(0, FIRST_PAGE_ROWS)];
  for (let index = FIRST_PAGE_ROWS; index < items.length; index += CONTINUATION_PAGE_ROWS) {
    pages.push(items.slice(index, index + CONTINUATION_PAGE_ROWS));
  }
  return pages;
};

const splitControlPages = (items: SeniorityAwardReportLine[]): SeniorityAwardReportLine[][] => {
  const pages: SeniorityAwardReportLine[][] = [];
  for (let index = 0; index < items.length; index += CONTROL_PAGE_ROWS) {
    pages.push(items.slice(index, index + CONTROL_PAGE_ROWS));
  }
  return pages;
};

const ReportHeader = ({ report, logoId }: MonthlySeniorityAwardPdfDocumentProps) => (
  <Box sx={{ height: "22mm" }}>
    <Box sx={{ display: "grid", gridTemplateColumns: "171mm 1fr", height: "20mm" }}>
      <Box sx={{ display: "grid", gridTemplateColumns: "38mm 1fr", alignItems: "center", minWidth: 0 }}>
        <Box
          component="img"
          id={logoId}
          src="/harouge-report-logo.png"
          alt="Harouge Oil Operations"
          sx={{ width: "35mm", height: "20mm", objectFit: "contain" }}
        />
        <Box sx={{ minWidth: 0, pl: "1mm" }}>
          <Typography noWrap sx={{ color: NAVY, fontFamily: FONT_STACK, fontSize: "13.2pt", lineHeight: 1.05, fontWeight: 900 }}>
            HAROUGE OIL OPERATIONS
          </Typography>
          <Typography lang="ar" dir="rtl" noWrap sx={{ mt: "2.5mm", color: RED, fontFamily: "Tahoma, Arial, sans-serif", fontSize: "12.2pt", lineHeight: 1, fontWeight: 800 }}>
            الهروج للعمليات النفطية
          </Typography>
        </Box>
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: "28mm 1fr", alignContent: "center", pl: "5mm", borderLeft: `0.3mm solid ${TEXT}` }}>
        {[
          ["Document No.", report.documentNumber],
          ["Reporting Period", report.periodLabel],
          ["Issue Date", formatDate(report.generatedAt)],
          ["Department", report.department],
          ["Status", "DRAFT"],
          ["Classification", report.classification]
        ].map(([label, value]) => (
          <Box key={label} sx={{ display: "contents" }}>
            <Typography sx={{ color: TEXT, fontFamily: FONT_STACK, fontSize: "5.5pt", lineHeight: 1.1, fontWeight: 800 }}>{label}:</Typography>
            <Typography noWrap sx={{ color: value === "DRAFT" ? RED : TEXT, fontFamily: FONT_STACK, fontSize: "5.5pt", lineHeight: 1.1, fontWeight: value === "DRAFT" ? 900 : 500 }}>{value}</Typography>
          </Box>
        ))}
      </Box>
    </Box>
    <Box aria-hidden="true" sx={{ display: "grid", gridTemplateColumns: "39% 22% 39%", height: "0.8mm" }}>
      <Box sx={{ bgcolor: NAVY }} />
      <Box sx={{ bgcolor: RED }} />
      <Box sx={{ bgcolor: NAVY }} />
    </Box>
  </Box>
);

const SummaryMetric = ({ label, value, detail }: { label: string; value: string; detail: string }) => (
  <Box sx={{ minWidth: 0, px: "3mm", py: "2mm", borderRight: `0.2mm solid ${BORDER}`, "&:last-of-type": { borderRight: 0 } }}>
    <Typography noWrap sx={{ color: NAVY, fontFamily: FONT_STACK, fontSize: "6pt", fontWeight: 800 }}>{label}</Typography>
    <Typography noWrap sx={{ mt: "1.2mm", color: TEXT, fontFamily: FONT_STACK, fontSize: "12pt", lineHeight: 1, fontWeight: 900 }}>{value}</Typography>
    <Typography noWrap sx={{ mt: "1mm", color: "#5b6679", fontFamily: FONT_STACK, fontSize: "5.5pt", fontWeight: 600 }}>{detail}</Typography>
  </Box>
);

const ReportTable = ({ rows, startIndex }: { rows: SeniorityAwardReportLine[]; startIndex: number }) => (
  <Box
    component="table"
    aria-label="Monthly seniority awards"
    sx={{
      width: "100%",
      mt: "2mm",
      tableLayout: "fixed",
      borderCollapse: "collapse",
      border: `0.25mm solid ${BORDER}`,
      fontFamily: FONT_STACK
    }}
  >
    <colgroup>
      <col style={{ width: "4%" }} />
      <col style={{ width: "7%" }} />
      <col style={{ width: "17%" }} />
      <col style={{ width: "8%" }} />
      <col style={{ width: "9%" }} />
      <col style={{ width: "14%" }} />
      <col style={{ width: "9%" }} />
      <col style={{ width: "8%" }} />
      <col style={{ width: "8%" }} />
      <col style={{ width: "6%" }} />
      <col style={{ width: "10%" }} />
    </colgroup>
    <thead>
      <tr style={{ height: "7mm", backgroundColor: NAVY, color: "#fff" }}>
        {["#", "Emp. No.", "Employee Name", "Finance No.", "Department", "Current Job", "Location", "Contract Start", "Eligibility", "Award", "Award Amount / Status"].map((label) => (
          <th key={label} style={{ padding: "0 0.8mm", borderRight: "0.15mm solid rgba(255,255,255,0.5)", fontSize: "5.6pt", lineHeight: 1.05, fontWeight: 800, textAlign: "center" }}>
            {label}
          </th>
        ))}
      </tr>
    </thead>
    <tbody>
      {rows.length === 0 ? (
        <tr style={{ height: "18mm" }}>
          <td colSpan={11} style={{ color: "#5b6679", fontSize: "7pt", fontWeight: 700, textAlign: "center" }}>
            No seniority awards are due for this reporting period.
          </td>
        </tr>
      ) : rows.map((line, index) => (
        <tr key={line.key} style={{ height: "8mm", backgroundColor: index % 2 === 1 ? "#f4f6f9" : "#fff" }}>
          <td style={{ padding: "0 0.7mm", border: `0.15mm solid ${BORDER}`, fontSize: "5.6pt", fontWeight: 700, textAlign: "center" }}>{startIndex + index + 1}</td>
          <td style={{ padding: "0 0.7mm", border: `0.15mm solid ${BORDER}`, fontSize: "5.6pt", fontWeight: 700, textAlign: "center" }}>{line.employeeNumber || "-"}</td>
          <td dir="auto" style={{ padding: "0 1mm", border: `0.15mm solid ${BORDER}`, overflow: "hidden" }}>
            <div style={{ fontSize: "5.5pt", lineHeight: 1.1, fontWeight: 700, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{line.employeeName}</div>
            {line.employeeNameArabic && line.employeeNameArabic !== line.employeeName && (
              <div dir="rtl" style={{ marginTop: "0.45mm", color: "#5b6679", fontFamily: "Tahoma, Arial, sans-serif", fontSize: "4.7pt", lineHeight: 1.05, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{line.employeeNameArabic}</div>
            )}
          </td>
          <td style={{ padding: "0 0.7mm", border: `0.15mm solid ${BORDER}`, fontSize: "5.5pt", textAlign: "center" }}>{line.financeNumber || "-"}</td>
          <td dir="auto" style={{ padding: "0 0.8mm", border: `0.15mm solid ${BORDER}`, fontSize: "5.4pt", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{line.departmentName}</td>
          <td dir="auto" style={{ padding: "0 0.8mm", border: `0.15mm solid ${BORDER}`, overflow: "hidden" }}>
            <div style={{ fontSize: "5.2pt", lineHeight: 1.05, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{line.jobName}</div>
            <div style={{ marginTop: "0.45mm", color: "#5b6679", fontSize: "4.5pt", lineHeight: 1.05, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{line.employeeType} · Grade {line.grade}</div>
          </td>
          <td dir="auto" style={{ padding: "0 0.8mm", border: `0.15mm solid ${BORDER}`, overflow: "hidden" }}>
            <div style={{ fontSize: "5.2pt", lineHeight: 1.05, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{line.workLocation}</div>
            <div style={{ marginTop: "0.45mm", color: "#5b6679", fontSize: "4.5pt", lineHeight: 1.05, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{line.contractType}</div>
          </td>
          <td style={{ padding: "0 0.7mm", border: `0.15mm solid ${BORDER}`, fontSize: "5.4pt", textAlign: "center" }}>{formatDate(line.contractStartDate)}</td>
          <td style={{ padding: "0 0.7mm", border: `0.15mm solid ${BORDER}`, fontSize: "5.4pt", textAlign: "center" }}>{formatDate(line.eligibilityDate)}</td>
          <td style={{ padding: "0 0.7mm", border: `0.15mm solid ${BORDER}`, color: NAVY, fontSize: "5.6pt", fontWeight: 800, textAlign: "center" }}>{line.milestoneYears} Years</td>
          <td style={{ padding: "0 0.7mm", border: `0.15mm solid ${BORDER}`, color: statusColor(line.status), fontSize: "5.6pt", fontWeight: 800, textAlign: "center" }}>
            {moneyFormatter.format(line.scheduledAmount)}
            <div style={{ marginTop: "0.35mm", fontSize: "4.6pt" }}>{statusLabel(line.status)}</div>
          </td>
        </tr>
      ))}
    </tbody>
  </Box>
);

const serviceSupplementLabel = (line: SeniorityAwardReportLine): string => {
  if (!line.serviceSupplement.isRecorded) return "None recorded";
  const duration = [
    line.serviceSupplement.years ? `${line.serviceSupplement.years}y` : "",
    line.serviceSupplement.months ? `${line.serviceSupplement.months}m` : "",
    line.serviceSupplement.days ? `${line.serviceSupplement.days}d` : ""
  ].filter(Boolean).join(" ") || "Recorded";
  return line.serviceSupplement.approvalDate
    ? `${duration}; approved ${formatDate(line.serviceSupplement.approvalDate)}`
    : duration;
};

const controlNotes = (line: SeniorityAwardReportLine): string => {
  const notes = [
    line.holdReason,
    ...line.validationWarnings,
    line.seniorityPercentage !== null ? `Recorded seniority percentage: ${line.seniorityPercentage}` : null,
    line.urgentAwardDate ? `Urgent award date: ${formatDate(line.urgentAwardDate)}` : null
  ].filter((value): value is string => Boolean(value));
  return Array.from(new Set(notes)).join("; ") || "No exception recorded";
};

const ControlTable = ({ rows, startIndex }: { rows: SeniorityAwardReportLine[]; startIndex: number }) => (
  <Box
    component="table"
    aria-label="Seniority award control and exception details"
    sx={{
      width: "100%",
      mt: "2mm",
      tableLayout: "fixed",
      borderCollapse: "collapse",
      border: `0.25mm solid ${BORDER}`,
      fontFamily: FONT_STACK
    }}
  >
    <colgroup>
      <col style={{ width: "4%" }} />
      <col style={{ width: "8%" }} />
      <col style={{ width: "20%" }} />
      <col style={{ width: "11%" }} />
      <col style={{ width: "25%" }} />
      <col style={{ width: "32%" }} />
    </colgroup>
    <thead>
      <tr style={{ height: "7mm", backgroundColor: NAVY, color: "#fff" }}>
        {["#", "Emp. No.", "Employee", "Award", "Administrative Detail", "Control / Exception Detail"].map((label) => (
          <th key={label} style={{ padding: "0 1mm", borderRight: "0.15mm solid rgba(255,255,255,0.5)", fontSize: "5.7pt", lineHeight: 1.05, fontWeight: 800, textAlign: "center" }}>
            {label}
          </th>
        ))}
      </tr>
    </thead>
    <tbody>
      {rows.map((line, index) => (
        <tr key={`control:${line.key}`} style={{ height: "11mm", backgroundColor: index % 2 === 1 ? "#f4f6f9" : "#fff" }}>
          <td style={{ padding: "1mm", border: `0.15mm solid ${BORDER}`, fontSize: "5.5pt", fontWeight: 700, textAlign: "center" }}>{startIndex + index + 1}</td>
          <td style={{ padding: "1mm", border: `0.15mm solid ${BORDER}`, fontSize: "5.5pt", fontWeight: 700, textAlign: "center" }}>{line.employeeNumber || "-"}</td>
          <td dir="auto" style={{ padding: "1mm", border: `0.15mm solid ${BORDER}`, fontSize: "5.5pt", lineHeight: 1.25, fontWeight: 700, overflowWrap: "anywhere" }}>
            {line.employeeName}
            {line.employeeNameArabic && line.employeeNameArabic !== line.employeeName && <div dir="rtl" style={{ marginTop: "0.7mm", color: "#5b6679", fontFamily: "Tahoma, Arial, sans-serif", fontSize: "4.8pt" }}>{line.employeeNameArabic}</div>}
          </td>
          <td style={{ padding: "1mm", border: `0.15mm solid ${BORDER}`, color: statusColor(line.status), fontSize: "5.5pt", lineHeight: 1.3, fontWeight: 800, textAlign: "center" }}>
            {line.milestoneYears} Years
            <div style={{ marginTop: "0.7mm" }}>{moneyFormatter.format(line.scheduledAmount)} LYD</div>
            <div style={{ marginTop: "0.5mm", fontSize: "4.7pt" }}>{statusLabel(line.status)}</div>
          </td>
          <td style={{ padding: "1mm", border: `0.15mm solid ${BORDER}`, color: TEXT, fontSize: "5.1pt", lineHeight: 1.35, verticalAlign: "top", overflowWrap: "anywhere" }}>
            Finance: {line.financeNumber || "Not recorded"}<br />
            Type: {line.employeeType} · Contract: {line.contractType} · Grade: {line.grade}<br />
            Service supplement: {serviceSupplementLabel(line)}
          </td>
          <td style={{ padding: "1mm", border: `0.15mm solid ${BORDER}`, color: TEXT, fontSize: "5.1pt", lineHeight: 1.35, verticalAlign: "top", overflowWrap: "anywhere" }}>
            {controlNotes(line)}
          </td>
        </tr>
      ))}
    </tbody>
  </Box>
);

const ApprovalStrip = () => (
  <Box sx={{ position: "absolute", left: "7mm", right: "7mm", bottom: "13mm", height: "20mm", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", border: `0.3mm solid ${NAVY}` }}>
    {["Prepared By", "Reviewed By", "HR Manager Approval", "Finance Acknowledgment"].map((title, index) => (
      <Box key={title} sx={{ px: "3mm", pt: "2mm", borderRight: index === 3 ? 0 : `0.2mm solid ${BORDER}` }}>
        <Typography align="center" sx={{ color: NAVY, fontFamily: FONT_STACK, fontSize: "6pt", fontWeight: 900 }}>{title}</Typography>
        <Box sx={{ mt: "2.2mm", display: "grid", gridTemplateColumns: "12mm 1fr", gap: "2mm" }}>
          <Typography sx={{ color: TEXT, fontFamily: FONT_STACK, fontSize: "5pt" }}>Name:</Typography>
          <Box sx={{ borderBottom: `0.15mm solid ${BORDER}` }} />
          <Typography sx={{ color: TEXT, fontFamily: FONT_STACK, fontSize: "5pt" }}>Date:</Typography>
          <Box sx={{ borderBottom: `0.15mm solid ${BORDER}` }} />
          <Typography sx={{ color: TEXT, fontFamily: FONT_STACK, fontSize: "5pt" }}>Signature:</Typography>
          <Box sx={{ borderBottom: `0.15mm solid ${BORDER}` }} />
        </Box>
      </Box>
    ))}
  </Box>
);

const FinalTotalsAndApprovals = ({ report }: { report: MonthlySeniorityAwardReport }) => (
  <>
    <Box sx={{ position: "absolute", left: "7mm", right: "7mm", bottom: "35mm", height: "8mm", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", border: `0.25mm solid ${BORDER}`, bgcolor: "#f5f7fa" }}>
      <Typography sx={{ display: "grid", placeItems: "center", color: NAVY, fontFamily: FONT_STACK, fontSize: "6pt", fontWeight: 900 }}>Awards: {report.summary.awardsDue}</Typography>
      <Typography sx={{ display: "grid", placeItems: "center", color: AMBER, fontFamily: FONT_STACK, fontSize: "6pt", fontWeight: 900 }}>Review: {moneyFormatter.format(report.summary.reviewAmount)} LYD</Typography>
      <Typography sx={{ display: "grid", placeItems: "center", color: RED, fontFamily: FONT_STACK, fontSize: "6pt", fontWeight: 900 }}>Held: {moneyFormatter.format(report.summary.heldAmount)} LYD</Typography>
      <Typography sx={{ display: "grid", placeItems: "center", color: GREEN, fontFamily: FONT_STACK, fontSize: "6pt", fontWeight: 900 }}>Validated Payable: {moneyFormatter.format(report.summary.payableAmount)} LYD</Typography>
    </Box>
    <ApprovalStrip />
  </>
);

const PageFooter = ({ report, pageNumber, totalPages }: { report: MonthlySeniorityAwardReport; pageNumber: number; totalPages: number }) => (
  <Box sx={{ position: "absolute", left: "7mm", right: "7mm", bottom: "4mm", height: "6mm", textAlign: "center" }}>
    <Box aria-hidden="true" sx={{ display: "grid", gridTemplateColumns: "39% 22% 39%", height: "0.6mm" }}>
      <Box sx={{ bgcolor: NAVY }} /><Box sx={{ bgcolor: RED }} /><Box sx={{ bgcolor: NAVY }} />
    </Box>
    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: "1mm" }}>
      <Typography sx={{ color: RED, fontFamily: FONT_STACK, fontSize: "4.8pt", fontWeight: 900 }}>DRAFT · NOT SUBMITTED · Internal administrative use only</Typography>
      <Typography sx={{ color: NAVY, fontFamily: FONT_STACK, fontSize: "5.2pt", fontWeight: 900 }}>Page {pageNumber} of {totalPages}</Typography>
      <Typography sx={{ color: "#566176", fontFamily: FONT_STACK, fontSize: "4.8pt" }}>{report.documentNumber}</Typography>
    </Box>
  </Box>
);

export const MonthlySeniorityAwardPdfDocument = ({ report, logoId }: MonthlySeniorityAwardPdfDocumentProps) => {
  const pages = splitIntoPages(report.items);
  const controlRows = report.items.filter((line) =>
    line.status !== "eligible"
    || line.validationWarnings.length > 0
    || line.serviceSupplement.isRecorded
    || line.seniorityPercentage !== null
    || Boolean(line.urgentAwardDate)
  );
  const controlPages = splitControlPages(controlRows);
  const totalPages = pages.length + controlPages.length;

  return (
    <Box className="monthly-seniority-award-pdf-document" sx={{ bgcolor: "#fff", color: TEXT, fontFamily: FONT_STACK }}>
      {pages.map((rows, pageIndex) => {
        const isFirstPage = pageIndex === 0;
        const isLastRegisterPage = pageIndex === pages.length - 1;
        const isFinalPage = isLastRegisterPage && controlPages.length === 0;
        const rowStartIndex = pageIndex === 0
          ? 0
          : FIRST_PAGE_ROWS + ((pageIndex - 1) * CONTINUATION_PAGE_ROWS);

        return (
          <Box
            key={`${report.period}:${pageIndex}`}
            className="monthly-seniority-award-pdf-page"
            sx={{
              position: "relative",
              width: "297mm",
              height: "210mm",
              boxSizing: "border-box",
              overflow: "hidden",
              px: "7mm",
              pt: "5mm",
              pb: "5mm",
              border: "0.2mm solid #d7d7d7",
              bgcolor: "#fff",
              breakAfter: isFinalPage ? "auto" : "page",
              WebkitPrintColorAdjust: "exact",
              printColorAdjust: "exact"
            }}
          >
            <ReportHeader report={report} logoId={pageIndex === 0 ? logoId : `${logoId}-${pageIndex}`} />

            {isFirstPage ? (
              <>
                <Box sx={{ height: "13mm", pt: "2mm", textAlign: "center" }}>
                  <Typography sx={{ color: NAVY, fontFamily: FONT_STACK, fontSize: "15pt", lineHeight: 1, fontWeight: 900 }}>
                    MONTHLY SENIORITY AWARD REPORT
                  </Typography>
                  <Typography lang="ar" dir="rtl" sx={{ mt: "1.5mm", color: RED, fontFamily: "Tahoma, Arial, sans-serif", fontSize: "10.5pt", lineHeight: 1, fontWeight: 800 }}>
                    التقرير الشهري لمكافآت الأقدمية
                  </Typography>
                </Box>

                <Typography sx={{ mb: "1mm", color: NAVY, fontFamily: FONT_STACK, fontSize: "6.2pt", fontWeight: 900 }}>
                  EXECUTIVE SUMMARY
                </Typography>
                <Box sx={{ height: "21mm", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", border: `0.25mm solid ${BORDER}` }}>
                  <SummaryMetric label="EMPLOYEES DUE" value={String(report.summary.employeesDue)} detail={`${report.summary.awardsDue} award records`} />
                  <SummaryMetric label="SCHEDULED AMOUNT" value={`${moneyFormatter.format(report.summary.scheduledAmount)} LYD`} detail="Before holds and reviews" />
                  <SummaryMetric label="VALIDATED PAYABLE" value={`${moneyFormatter.format(report.summary.payableAmount)} LYD`} detail="Validated rows only" />
                  <SummaryMetric label="HOLDS / REVIEW" value={`${report.summary.heldAwards} / ${report.summary.reviewRequiredAwards}`} detail={`${report.summary.rowsWithValidationWarnings} rows with warnings`} />
                </Box>

                <Box sx={{ mt: "2mm", minHeight: "11mm", display: "grid", gridTemplateColumns: "7mm 1fr", alignItems: "center", px: "2.5mm", border: `0.2mm solid ${BORDER}`, bgcolor: "#f5f7fa" }}>
                  {report.summary.heldAwards > 0 || report.summary.reviewRequiredAwards > 0
                    ? <ErrorOutlineRoundedIcon sx={{ width: "5mm", height: "5mm", color: AMBER }} />
                    : <CheckCircleRoundedIcon sx={{ width: "5mm", height: "5mm", color: GREEN }} />}
                  <Box>
                    <Typography sx={{ color: TEXT, fontFamily: FONT_STACK, fontSize: "5.5pt", lineHeight: 1.25, fontWeight: 600 }}>
                      <Box component="span" sx={{ color: NAVY, fontWeight: 900 }}>Calculation basis: </Box>
                      {report.policy.note}
                    </Typography>
                    <Typography sx={{ mt: "0.7mm", color: "#5b6679", fontFamily: FONT_STACK, fontSize: "4.8pt", lineHeight: 1.15, fontWeight: 600 }}>
                      Generated by {report.generatedBy.name} on {formatDateTime(report.generatedAt)} · Policy: {report.policy.version}
                    </Typography>
                  </Box>
                </Box>
              </>
            ) : (
              <Box sx={{ height: "8mm", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Typography sx={{ color: NAVY, fontFamily: FONT_STACK, fontSize: "8pt", fontWeight: 900 }}>MONTHLY SENIORITY AWARD REPORT - DETAIL CONTINUED</Typography>
                <Typography sx={{ color: RED, fontFamily: FONT_STACK, fontSize: "6pt", fontWeight: 900 }}>DRAFT · {report.periodLabel}</Typography>
              </Box>
            )}

            <ReportTable rows={rows} startIndex={rowStartIndex} />

            {isFinalPage && <FinalTotalsAndApprovals report={report} />}
            <PageFooter report={report} pageNumber={pageIndex + 1} totalPages={totalPages} />
          </Box>
        );
      })}

      {controlPages.map((rows, controlPageIndex) => {
        const pageIndex = pages.length + controlPageIndex;
        const isFinalPage = controlPageIndex === controlPages.length - 1;
        return (
          <Box
            key={`${report.period}:control:${controlPageIndex}`}
            className="monthly-seniority-award-pdf-page"
            sx={{
              position: "relative",
              width: "297mm",
              height: "210mm",
              boxSizing: "border-box",
              overflow: "hidden",
              px: "7mm",
              pt: "5mm",
              pb: "5mm",
              border: "0.2mm solid #d7d7d7",
              bgcolor: "#fff",
              breakAfter: isFinalPage ? "auto" : "page",
              WebkitPrintColorAdjust: "exact",
              printColorAdjust: "exact"
            }}
          >
            <ReportHeader report={report} logoId={`${logoId}-${pageIndex}`} />
            <Box sx={{ height: "14mm", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Box>
                <Typography sx={{ color: NAVY, fontFamily: FONT_STACK, fontSize: "9pt", fontWeight: 900 }}>CONTROL & EXCEPTION ANNEX</Typography>
                <Typography sx={{ mt: "0.8mm", color: "#5b6679", fontFamily: FONT_STACK, fontSize: "5.2pt", fontWeight: 600 }}>
                  Held and review-required records, including all recorded adjustments and validation notes.
                </Typography>
              </Box>
              <Typography sx={{ color: RED, fontFamily: FONT_STACK, fontSize: "6pt", fontWeight: 900 }}>DRAFT · {report.periodLabel}</Typography>
            </Box>
            <ControlTable rows={rows} startIndex={controlPageIndex * CONTROL_PAGE_ROWS} />
            {isFinalPage && <FinalTotalsAndApprovals report={report} />}
            <PageFooter report={report} pageNumber={pageIndex + 1} totalPages={totalPages} />
          </Box>
        );
      })}
    </Box>
  );
};
