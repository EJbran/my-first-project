import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import FiberManualRecordRoundedIcon from "@mui/icons-material/FiberManualRecordRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import RadioButtonCheckedRoundedIcon from "@mui/icons-material/RadioButtonCheckedRounded";
import RadioButtonUncheckedRoundedIcon from "@mui/icons-material/RadioButtonUncheckedRounded";
import TollRoundedIcon from "@mui/icons-material/TollRounded";
import WorkspacePremiumRoundedIcon from "@mui/icons-material/WorkspacePremiumRounded";
import { Box, LinearProgress, Typography } from "@mui/material";
import type { ReactNode } from "react";
import { lydAmountFormatter, type SenioritySchedule } from "../jobs//senioritySchedule";

export type SeniorityReportEmployee = {
  id?: string;
  employeeNumber?: string;
  name?: string;
  workLocation?: string;
  jobName?: string;
  employeeType?: string;
  contractType?: string;
  phone?: string;
  financeNumber?: string;
  contractStart?: string;
  status?: string;
};

type EmployeeSeniorityPdfDocumentProps = {
  employee: SeniorityReportEmployee;
  schedule: SenioritySchedule;
  documentNumber: string;
  logoId: string;
};

type DetailCellProps = {
  label: string;
  value?: string;
  rightColumn?: boolean;
  lastRow?: boolean;
  valueColor?: string;
};

type MetricCellProps = {
  icon: ReactNode;
  label: string;
  value: string;
  last?: boolean;
};

const NAVY = "#031c68";
const RED = "#e00e14";
const GREEN = "#087a43";
const BORDER = "#8f97a7";
const BODY_TEXT = "#161d2e";
const ZEBRA = "#f5f6f7";
const FONT_STACK = 'Arial, Tahoma, sans-serif';

const valueOrDash = (value?: string): string => value?.trim() || "-";

const TricolorRule = () => (
  <Box aria-hidden="true" sx={{ display: "grid", gridTemplateColumns: "36% 27% 37%", height: "0.8mm" }}>
    <Box sx={{ bgcolor: NAVY }} />
    <Box sx={{ bgcolor: RED }} />
    <Box sx={{ bgcolor: NAVY }} />
  </Box>
);

const MetadataRow = ({ label, value }: { label: string; value: string }) => (
  <Box sx={{ display: "grid", gridTemplateColumns: "28mm minmax(0, 1fr)", alignItems: "center", minHeight: "4.5mm" }}>
    <Typography sx={{ color: BODY_TEXT, fontFamily: FONT_STACK, fontSize: "7.2pt", fontWeight: 800, whiteSpace: "nowrap" }}>
      {label}
    </Typography>
    <Typography noWrap sx={{ color: BODY_TEXT, fontFamily: FONT_STACK, fontSize: "7.2pt", fontWeight: 500 }}>
      {value}
    </Typography>
  </Box>
);

const DetailCell = ({ label, value, rightColumn = false, lastRow = false, valueColor = BODY_TEXT }: DetailCellProps) => (
  <Box
    sx={{
      minWidth: 0,
      display: "grid",
      gridTemplateColumns: "41% minmax(0, 59%)",
      alignItems: "center",
      px: "4mm",
      borderRight: rightColumn ? 0 : `0.2mm solid ${BORDER}`,
      borderBottom: lastRow ? 0 : `0.2mm solid ${BORDER}`,
      overflow: "hidden"
    }}
  >
    <Typography noWrap sx={{ color: NAVY, fontFamily: FONT_STACK, fontSize: "7.3pt", fontWeight: 800 }}>
      {label}
    </Typography>
    <Typography
      noWrap
      dir="auto"
      sx={{ color: valueColor, fontFamily: FONT_STACK, fontSize: "7.4pt", fontWeight: valueColor === GREEN ? 800 : 500, textAlign: "center" }}
    >
      {valueOrDash(value)}
    </Typography>
  </Box>
);

const MetricCell = ({ icon, label, value, last = false }: MetricCellProps) => (
  <Box
    sx={{
      minWidth: 0,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      borderRight: last ? 0 : `0.2mm solid ${BORDER}`,
      color: NAVY,
      overflow: "hidden",
      "& .MuiSvgIcon-root": { width: "8.5mm", height: "8.5mm" }
    }}
  >
    {icon}
    <Typography noWrap sx={{ mt: "1.1mm", maxWidth: "100%", px: "1mm", color: NAVY, fontFamily: FONT_STACK, fontSize: "6.7pt", fontWeight: 800 }}>
      {label}
    </Typography>
    <Typography noWrap sx={{ mt: "1.2mm", maxWidth: "100%", px: "1mm", color: BODY_TEXT, fontFamily: FONT_STACK, fontSize: "11.8pt", lineHeight: 1, fontWeight: 800 }}>
      {value}
    </Typography>
  </Box>
);

const ApprovalCell = ({ title, last = false }: { title: string; last?: boolean }) => (
  <Box
    sx={{
      position: "relative",
      px: "2.4mm",
      pt: "3.2mm",
      borderRight: last ? 0 : `0.2mm solid ${BORDER}`,
      overflow: "hidden"
    }}
  >
    <Typography align="center" sx={{ color: NAVY, fontFamily: FONT_STACK, fontSize: "7.4pt", fontWeight: 800 }}>
      {title}
    </Typography>
    <Box aria-hidden="true" sx={{ width: "18mm", height: "0.45mm", mx: "auto", mt: "1.5mm", bgcolor: RED }} />
    {[
      ["Name:", ""],
      ["Signature:", ""],
      ["Date:", ""]
    ].map(([label]) => (
      <Box key={label} sx={{ display: "grid", gridTemplateColumns: "12mm 1fr", alignItems: "end", mt: "3.2mm" }}>
        <Typography sx={{ color: BODY_TEXT, fontFamily: FONT_STACK, fontSize: "6.2pt", fontWeight: 500 }}>{label}</Typography>
        <Box aria-hidden="true" sx={{ height: "0.2mm", mb: "0.55mm", bgcolor: BORDER }} />
      </Box>
    ))}
    <Typography sx={{ mt: "3.4mm", color: BODY_TEXT, fontFamily: FONT_STACK, fontSize: "6.2pt", fontWeight: 500 }}>Stamp:</Typography>
    <Box
      aria-hidden="true"
      sx={{
        position: "absolute",
        left: "50%",
        bottom: "4.3mm",
        width: "12mm",
        height: "12mm",
        border: `0.25mm dashed ${BODY_TEXT}`,
        borderRadius: "50%",
        transform: "translateX(-50%)"
      }}
    />
  </Box>
);

const MilestoneProgress = ({ schedule }: { schedule: SenioritySchedule }) => {
  const latestEarnedYears = schedule.latestEarnedMilestone?.serviceYears;
  const earnedCount = schedule.milestones.filter((milestone) => milestone.isEarned).length;

  return (
    <Box
      component="section"
      aria-label="Service milestone progress"
      sx={{
        position: "absolute",
        top: "135mm",
        left: "6.5mm",
        right: "6.5mm",
        height: "14mm",
        boxSizing: "border-box",
        px: "3.2mm",
        pt: "1.3mm",
        border: `0.25mm solid ${BORDER}`,
        bgcolor: "#f7fbf8",
        overflow: "hidden"
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", minWidth: 0 }}>
        <Typography sx={{ color: NAVY, fontFamily: FONT_STACK, fontSize: "6.5pt", lineHeight: 1, fontWeight: 900 }}>
          SERVICE MILESTONE PROGRESS
        </Typography>
        <Typography sx={{ color: GREEN, fontFamily: FONT_STACK, fontSize: "6.3pt", lineHeight: 1, fontWeight: 800 }}>
          {earnedCount} of {schedule.milestones.length} milestones earned
        </Typography>
      </Box>

      <Box sx={{ position: "relative", mt: "1.3mm", height: "8.2mm" }}>
        <LinearProgress
          aria-hidden="true"
          variant="determinate"
          value={schedule.progress}
          sx={{
            position: "absolute",
            top: "2.25mm",
            left: "5%",
            right: "5%",
            width: "auto",
            height: "0.9mm",
            boxSizing: "border-box",
            border: "0.18mm solid #9bcaaa",
            borderRadius: "99px",
            bgcolor: "#cfe8d6",
            "& .MuiLinearProgress-bar": { borderRadius: "99px", bgcolor: GREEN }
          }}
        />
        <Box sx={{ position: "relative", zIndex: 1, display: "grid", gridTemplateColumns: "repeat(10, minmax(0, 1fr))", height: "100%" }}>
          {schedule.milestones.map((milestone) => {
            const isLatestEarned = milestone.serviceYears === latestEarnedYears;
            const NodeIcon = isLatestEarned
              ? RadioButtonCheckedRoundedIcon
              : milestone.isEarned
                ? FiberManualRecordRoundedIcon
                : RadioButtonUncheckedRoundedIcon;

            return (
              <Box key={milestone.serviceYears} sx={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 0 }}>
                <Box sx={{ width: "4.9mm", height: "4.9mm", display: "grid", placeItems: "center", borderRadius: "50%", bgcolor: "#fff" }}>
                  <NodeIcon sx={{ width: isLatestEarned ? "4.7mm" : "3.5mm", height: isLatestEarned ? "4.7mm" : "3.5mm", color: milestone.isEarned ? GREEN : BORDER }} />
                </Box>
                <Typography noWrap sx={{ mt: "0.45mm", color: milestone.isEarned ? NAVY : "#687087", fontFamily: FONT_STACK, fontSize: "5.6pt", lineHeight: 1, fontWeight: isLatestEarned ? 900 : 700 }}>
                  {milestone.serviceYears} Years
                </Typography>
              </Box>
            );
          })}
        </Box>
      </Box>
    </Box>
  );
};

export const EmployeeSeniorityPdfDocument = ({
  employee,
  schedule,
  documentNumber,
  logoId
}: EmployeeSeniorityPdfDocumentProps) => {
  const latestEarned = schedule.latestEarnedMilestone;
  const status = valueOrDash(employee.status);
  const statusColor = status.toLocaleLowerCase("en-US") === "active" ? GREEN : NAVY;

  return (
    <Box
      className="seniority-pdf-page"
      sx={{
        position: "relative",
        width: "210mm",
        height: "297mm",
        boxSizing: "border-box",
        overflow: "hidden",
        border: "0.2mm solid #d7d7d7",
        bgcolor: "#fff",
        color: BODY_TEXT,
        fontFamily: FONT_STACK,
        WebkitPrintColorAdjust: "exact",
        printColorAdjust: "exact"
      }}
    >
      <Box component="header" sx={{ position: "absolute", top: "4mm", left: "6.5mm", right: "6.5mm", height: "31mm" }}>
        <Box sx={{ display: "grid", gridTemplateColumns: "61% 39%", height: "29mm" }}>
          <Box sx={{ display: "grid", gridTemplateColumns: "44mm minmax(0, 1fr)", alignItems: "center", minWidth: 0 }}>
            <Box
              component="img"
              id={logoId}
              src="/harouge-report-logo.png"
              alt="Harouge Oil Operations"
              sx={{ width: "43mm", height: "27mm", objectFit: "contain", objectPosition: "center" }}
            />
            <Box sx={{ minWidth: 0, textAlign: "center" }}>
              <Typography noWrap sx={{ color: NAVY, fontFamily: FONT_STACK, fontSize: "13.2pt", lineHeight: 1.05, fontWeight: 900, letterSpacing: "-0.45pt" }}>
                HAROUGE OIL OPERATIONS
              </Typography>
              <Typography lang="ar" dir="rtl" noWrap sx={{ mt: "3.2mm", color: RED, fontFamily: "Tahoma, Arial, sans-serif", fontSize: "15pt", lineHeight: 1.15, fontWeight: 800 }}>
                الهروج للعمليات النفطية
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: "flex", flexDirection: "column", justifyContent: "center", pl: "5.5mm", borderLeft: `0.35mm solid ${BODY_TEXT}` }}>
            <MetadataRow label="Document Title:" value="Employee Seniority Reward Report" />
            <MetadataRow label="Document No.:" value={documentNumber} />
            <MetadataRow label="Department:" value="Human Resources" />
            <MetadataRow label="Issue Date:" value={schedule.asOf.format("DD-MM-YYYY")} />
            <MetadataRow label="Classification:" value="Internal Use" />
          </Box>
        </Box>
        <TricolorRule />
      </Box>

      <Box component="section" sx={{ position: "absolute", top: "37mm", left: "6.5mm", right: "6.5mm", height: "22.5mm", textAlign: "center" }}>
        <Typography sx={{ color: NAVY, fontFamily: FONT_STACK, fontSize: "19pt", lineHeight: 1.08, fontWeight: 900, letterSpacing: "0.25pt" }}>
          EMPLOYEE SENIORITY REWARD REPORT
        </Typography>
        <Typography lang="ar" dir="rtl" sx={{ mt: "2.2mm", color: RED, fontFamily: "Tahoma, Arial, sans-serif", fontSize: "16pt", lineHeight: 1.15, fontWeight: 800 }}>
          تقرير استحقاق مكافآت الأقدمية للموظف
        </Typography>
        <Typography noWrap sx={{ mt: "2.7mm", color: BODY_TEXT, fontFamily: FONT_STACK, fontSize: "7.4pt", fontWeight: 500 }}>
          This report summarizes the employee&apos;s seniority milestones, eligibility dates, and reward entitlements based on the recorded contract start date.
        </Typography>
      </Box>

      <Box
        component="section"
        aria-label="Employee details"
        sx={{
          position: "absolute",
          top: "61.5mm",
          left: "6.5mm",
          right: "6.5mm",
          height: "44.5mm",
          display: "grid",
          gridTemplateColumns: "17% 83%",
          border: `0.25mm solid ${BORDER}`
        }}
      >
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", borderRight: `0.25mm solid ${BORDER}` }}>
          <Box sx={{ width: "21.5mm", height: "21.5mm", display: "grid", placeItems: "center", border: `0.3mm solid ${NAVY}`, borderRadius: "50%", color: NAVY }}>
            <PersonRoundedIcon sx={{ width: "15mm", height: "15mm" }} />
          </Box>
          <Typography sx={{ mt: "3.4mm", color: NAVY, fontFamily: FONT_STACK, fontSize: "6.8pt", fontWeight: 900 }}>EMPLOYEE PROFILE</Typography>
          <Box aria-hidden="true" sx={{ width: "12mm", height: "0.35mm", mt: "2.4mm", bgcolor: NAVY }} />
        </Box>

        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gridTemplateRows: "repeat(5, 1fr)", minWidth: 0 }}>
          <DetailCell label="Employee Name:" value={employee.name} />
          <DetailCell label="Employee No.:" value={employee.employeeNumber ?? employee.id} rightColumn />
          <DetailCell label="Work Location:" value={employee.workLocation} />
          <DetailCell label="Current Job:" value={employee.jobName} rightColumn />
          <DetailCell label="Employee Type:" value={employee.employeeType} />
          <DetailCell label="Contract Type:" value={employee.contractType} rightColumn />
          <DetailCell label="Phone:" value={employee.phone} />
          <DetailCell label="Finance No.:" value={employee.financeNumber} rightColumn />
          <DetailCell label="Contract Start Date:" value={schedule.contractDate.format("DD-MM-YYYY")} lastRow />
          <DetailCell label="Report Status:" value={status} valueColor={statusColor} rightColumn lastRow />
        </Box>
      </Box>

      <Box
        component="section"
        aria-label="Seniority summary"
        sx={{
          position: "absolute",
          top: "108.5mm",
          left: "6.5mm",
          right: "6.5mm",
          height: "24mm",
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          border: `0.25mm solid ${BORDER}`
        }}
      >
        <MetricCell icon={<CalendarMonthRoundedIcon />} label="CONTRACT START DATE" value={schedule.contractDate.format("DD-MM-YYYY")} />
        <MetricCell icon={<GroupsRoundedIcon />} label="YEARS OF SERVICE" value={`${schedule.yearsOfService} ${schedule.yearsOfService === 1 ? "Year" : "Years"}`} />
        <MetricCell icon={<WorkspacePremiumRoundedIcon />} label="LATEST ANNUAL REWARD" value={latestEarned ? `${lydAmountFormatter.format(latestEarned.annualNetReward)} LYD` : "-"} />
        <MetricCell
          icon={<TollRoundedIcon />}
          label="TOTAL NET REWARD TO DATE"
          value={latestEarned ? `${lydAmountFormatter.format(schedule.totalNetRewardToDate)} LYD` : "-"}
          last
        />
      </Box>

      <MilestoneProgress schedule={schedule} />

      <Box
        component="table"
        aria-label="Employee seniority reward schedule"
        sx={{
          position: "absolute",
          top: "151.5mm",
          left: "6.5mm",
          width: "197mm",
          height: "63.5mm",
          tableLayout: "fixed",
          borderCollapse: "collapse",
          border: `0.25mm solid ${BORDER}`,
          fontFamily: FONT_STACK
        }}
      >
        <colgroup>
          <col style={{ width: "19.3%" }} />
          <col style={{ width: "18.4%" }} />
          <col style={{ width: "21.9%" }} />
          <col style={{ width: "24.1%" }} />
          <col style={{ width: "16.3%" }} />
        </colgroup>
        <thead>
          <tr style={{ height: "6.5mm", backgroundColor: NAVY, color: "#fff" }}>
            {[
              "Service Milestone",
              "Eligibility Date",
              "Annual Net Reward (LYD)",
              "Total Net Reward (LYD)",
              "Status"
            ].map((label) => (
              <th key={label} style={{ padding: "0 1mm", borderRight: "0.2mm solid rgba(255,255,255,0.55)", fontSize: "7.1pt", lineHeight: 1.1, fontWeight: 800, textAlign: "center" }}>
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {schedule.milestones.map((milestone, index) => (
            <tr key={milestone.serviceYears} style={{ height: "5.7mm", backgroundColor: index % 2 === 1 ? ZEBRA : "#fff" }}>
              <td style={{ padding: 0, borderRight: `0.2mm solid ${BORDER}`, borderTop: `0.15mm solid #d7dbe2`, color: BODY_TEXT, fontSize: "7pt", fontWeight: 700, textAlign: "center" }}>
                {milestone.serviceYears} years
              </td>
              <td style={{ padding: 0, borderRight: `0.2mm solid ${BORDER}`, borderTop: `0.15mm solid #d7dbe2`, color: BODY_TEXT, fontSize: "7pt", fontWeight: 600, textAlign: "center" }}>
                {milestone.eligibilityDate.format("DD-MM-YYYY")}
              </td>
              <td style={{ padding: 0, borderRight: `0.2mm solid ${BORDER}`, borderTop: `0.15mm solid #d7dbe2`, color: BODY_TEXT, fontSize: "7pt", fontWeight: 600, textAlign: "center" }}>
                {lydAmountFormatter.format(milestone.annualNetReward)}
              </td>
              <td style={{ padding: 0, borderRight: `0.2mm solid ${BORDER}`, borderTop: `0.15mm solid #d7dbe2`, color: BODY_TEXT, fontSize: "7pt", fontWeight: 600, textAlign: "center" }}>
                {lydAmountFormatter.format(milestone.totalNetReward)}
              </td>
              <td style={{ padding: 0, borderTop: `0.15mm solid #d7dbe2`, color: milestone.isEarned ? GREEN : NAVY, fontSize: "7pt", fontWeight: 800, textAlign: "center" }}>
                {milestone.isEarned ? "Earned" : "Upcoming"}
              </td>
            </tr>
          ))}
        </tbody>
      </Box>

      <Box
        component="section"
        aria-label="Calculation note"
        sx={{
          position: "absolute",
          top: "217.5mm",
          left: "6.5mm",
          right: "6.5mm",
          height: "13mm",
          display: "flex",
          alignItems: "center",
          gap: "3mm",
          px: "4mm",
          border: `0.25mm solid ${BORDER}`,
          bgcolor: "#f3f4f5",
          overflow: "hidden"
        }}
      >
        <InfoOutlinedIcon sx={{ flex: "0 0 auto", width: "7.5mm", height: "7.5mm", color: NAVY }} />
        <Typography sx={{ color: BODY_TEXT, fontFamily: FONT_STACK, fontSize: "7.1pt", lineHeight: 1.45, fontWeight: 500 }}>
          <Box component="span" sx={{ color: NAVY, fontWeight: 900 }}>Note: </Box>
          Seniority dates in this report are currently calculated using the Contract Start Date only.
          <br />
          Previous NOC service and non-counted periods are not applied in this version.
        </Typography>
      </Box>

      <Box
        component="section"
        aria-label="Report approvals"
        sx={{
          position: "absolute",
          top: "233mm",
          left: "6.5mm",
          right: "6.5mm",
          height: "46mm",
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          border: `0.3mm solid ${NAVY}`
        }}
      >
        <ApprovalCell title="Prepared By" />
        <ApprovalCell title="Reviewed By" />
        <ApprovalCell title="Approved By" />
        <ApprovalCell title="Employee Acknowledgment" last />
      </Box>

      <Box component="footer" sx={{ position: "absolute", top: "283mm", left: "6.5mm", right: "6.5mm", height: "11.5mm", textAlign: "center" }}>
        <TricolorRule />
        <Typography sx={{ mt: "2.2mm", color: NAVY, fontFamily: FONT_STACK, fontSize: "7.5pt", fontWeight: 800 }}>Page 1 of 1</Typography>
        <Typography sx={{ mt: "1.3mm", color: "#46506a", fontFamily: FONT_STACK, fontSize: "6.8pt", fontStyle: "italic", fontWeight: 500 }}>
          This document is the property of Harouge Oil Operations and is intended for internal administrative use only.
        </Typography>
      </Box>
    </Box>
  );
};
