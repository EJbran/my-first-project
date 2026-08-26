import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import EmailRoundedIcon from "@mui/icons-material/EmailRounded";
import SupportAgentRoundedIcon from "@mui/icons-material/SupportAgentRounded";
import LanguageRoundedIcon from "@mui/icons-material/LanguageRounded";
import { Alert, Box, Button, Chip, Paper, Stack, Typography } from "@mui/material";
import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";

type LocationState = {
  attemptedEmail?: string;
  message?: string;
};

export default function EmployeeLinkRequiredPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state || {}) as LocationState;

  const attemptedEmail = useMemo(
    () => (state.attemptedEmail || "").trim(),
    [state.attemptedEmail]
  );

  const message =
    state.message ||
    "Your sign-in email is not linked to any employee record in the HR Employee table.";

  const messageAr =
    "البريد الإلكتروني المستخدم لتسجيل الدخول غير مرتبط بأي سجل موظف في جدول الموظفين.";

  return (
    <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center", px: 2, py: 4 }}>
      <Paper
        elevation={0}
        sx={{
          width: "min(760px, 100%)",
          p: { xs: 2.2, md: 3.2 },
          borderRadius: 3,
          border: "1px solid",
          borderColor: "warning.main",
          bgcolor: "background.paper"
        }}
      >
        <Stack spacing={2}>
          <Stack alignItems="center" spacing={1.2}>
            <Box
              component="img"
              src="/logo.png"
              alt="Company Logo"
              sx={{ width: { xs: 82, md: 92 }, height: { xs: 82, md: 92 }, objectFit: "contain" }}
            />
            <Chip
              icon={<LanguageRoundedIcon />}
              label="العربية | English"
              variant="outlined"
              sx={{ fontWeight: 700 }}
            />
          </Stack>

          <Stack direction="row" spacing={1.2} alignItems="center">
            <WarningAmberRoundedIcon color="warning" sx={{ fontSize: 30 }} />
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 900, lineHeight: 1.2 }}>
                Sign-in Blocked | تم إيقاف تسجيل الدخول
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Employee mapping is required before access is allowed.
              </Typography>
              <Typography variant="body2" color="text.secondary" dir="rtl" sx={{ textAlign: "right" }}>
                يلزم ربط حسابك بسجل موظف قبل السماح بالدخول.
              </Typography>
            </Box>
          </Stack>

          <Alert severity="warning" sx={{ borderRadius: 2 }}>
            <Stack spacing={0.8}>
              <Typography variant="body2">{message}</Typography>
              <Typography variant="body2" dir="rtl" sx={{ textAlign: "right" }}>
                {messageAr}
              </Typography>
            </Stack>
          </Alert>

          <Stack spacing={1.1}>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              What this means | ماذا يعني هذا
            </Typography>
            <Typography variant="body2" color="text.secondary">
              For security and HR integrity, your account can only sign in when your email exists in the Employee table.
            </Typography>
            <Typography variant="body2" color="text.secondary" dir="rtl" sx={{ textAlign: "right" }}>
              للحفاظ على الأمان وسلامة بيانات الموارد البشرية، لا يمكن تسجيل الدخول إلا إذا كان بريدك موجودًا في جدول الموظفين.
            </Typography>
          </Stack>

          <Stack spacing={1.1}>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              Required action | الإجراء المطلوب
            </Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} useFlexGap flexWrap="wrap">
              <Chip icon={<EmailRoundedIcon />} label={`Email: ${attemptedEmail || "Not available"}`} variant="outlined" />
              <Chip icon={<SupportAgentRoundedIcon />} label="Contact IT Department / HR System Admin" color="warning" variant="outlined" />
              <Chip icon={<SupportAgentRoundedIcon />} label="تواصل مع إدارة تقنية المعلومات / إدارة الموارد البشرية" color="warning" variant="outlined" />
            </Stack>
            <Typography variant="body2" color="text.secondary">
              Ask IT to add or correct this email in Employee.Email and ensure your employee is linked to position and department records.
            </Typography>
            <Typography variant="body2" color="text.secondary" dir="rtl" sx={{ textAlign: "right" }}>
              اطلب من قسم تقنية المعلومات إضافة هذا البريد أو تصحيحه في Employee.Email والتأكد من ربط الموظف بالوظيفة والقسم.
            </Typography>
          </Stack>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.2} justifyContent="flex-end" pt={0.5}>
            <Button variant="outlined" onClick={() => navigate("/login", { replace: true })}>
              Back to Login | الرجوع لتسجيل الدخول
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Box>
  );
}
