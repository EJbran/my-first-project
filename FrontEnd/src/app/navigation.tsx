import SettingsSuggestRoundedIcon from "@mui/icons-material/SettingsSuggestRounded";
import AccountBalanceRoundedIcon from "@mui/icons-material/AccountBalanceRounded";
import AccountBalanceWalletRoundedIcon from "@mui/icons-material/AccountBalanceWalletRounded";
import PeopleAltRoundedIcon from "@mui/icons-material/PeopleAltRounded";
import LocalShippingRoundedIcon from "@mui/icons-material/LocalShippingRounded";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import LocationOnRoundedIcon from "@mui/icons-material/LocationOnRounded";
import BusinessRoundedIcon from "@mui/icons-material/BusinessRounded";
import ApartmentRoundedIcon from "@mui/icons-material/ApartmentRounded";
import GroupRoundedIcon from "@mui/icons-material/GroupRounded";
import SavingsRoundedIcon from "@mui/icons-material/SavingsRounded";
import TagRoundedIcon from "@mui/icons-material/TagRounded";
import AccountTreeRoundedIcon from "@mui/icons-material/AccountTreeRounded";
import ListAltRoundedIcon from "@mui/icons-material/ListAltRounded";
import HubRoundedIcon from "@mui/icons-material/HubRounded";
import AssignmentRoundedIcon from "@mui/icons-material/AssignmentRounded";
import FolderSpecialRoundedIcon from "@mui/icons-material/FolderSpecialRounded";
import ScheduleRoundedIcon from "@mui/icons-material/ScheduleRounded";
import EventAvailableRoundedIcon from "@mui/icons-material/EventAvailableRounded";
import BadgeRoundedIcon from "@mui/icons-material/BadgeRounded";
import HowToRegRoundedIcon from "@mui/icons-material/HowToRegRounded";
import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import TableChartRoundedIcon from "@mui/icons-material/TableChartRounded";
import BeachAccessRoundedIcon from "@mui/icons-material/BeachAccessRounded";
import PaymentsRoundedIcon from "@mui/icons-material/PaymentsRounded";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import ExitToAppRoundedIcon from "@mui/icons-material/ExitToAppRounded";
 import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import AssessmentRoundedIcon from "@mui/icons-material/AssessmentRounded";
 import StarRoundedIcon from "@mui/icons-material/StarRounded";
import CategoryRoundedIcon from "@mui/icons-material/CategoryRounded";
 
import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import MenuBookRoundedIcon from "@mui/icons-material/MenuBookRounded";
 
import type { Navigation } from "@toolpad/core/AppProvider";

export interface NavPermissionItem {
  path: string;
  permissions?: string[];
  requireAll?: boolean;
}

export const navPermissions: NavPermissionItem[] = [
  // TODO: enable when permission system is wired for AFE
  // { path: "/afe/afes", permissions: ["finance.afe.read"] }
];

export const navigation: Navigation = [
  {
    segment: "afe",
    title: "AFE",
    icon: <AssignmentRoundedIcon />,
    children: [
      {
        segment: "afes",
        title: "Authorization For Expenditure (AFE)",
        icon: <FolderSpecialRoundedIcon />
      }
    ]
  },
  {
    segment: "human-resources",
    title: "Human Resources",
    icon: <BadgeRoundedIcon />,
    children: [
      {
        segment: "human-resources/hr-dashboard",
        title: "Overview",
        icon: <DashboardRoundedIcon />
      },
      {
        segment: "onboarding",
        title: "Onboarding",
        icon: <HowToRegRoundedIcon />
      },
      {
        segment: "human-resources/employees/employees-list",
        title: "Employee List",
        icon: <BadgeRoundedIcon />
      },
      {
        segment: "timesheets-attendance",
        title: "Timesheets & Attendance",
        icon: <AccessTimeRoundedIcon />,
        children: [
          {
            segment: "timesheets",
            title: "Timesheets",
            icon: <TableChartRoundedIcon />
          }
        ]
      },
      {
        segment: "leave-management",
        title: "Leave Management",
        icon: <BeachAccessRoundedIcon />
      },
      {
        segment: "compensation-benefits",
        title: "Compensation & Benefits",
        icon: <PaymentsRoundedIcon />
      },
      {
        segment: "performance-management",
        title: "Performance Management",
        icon: <TrendingUpRoundedIcon />
      },
      {
        segment: "offboarding",
        title: "Offboarding",
        icon: <ExitToAppRoundedIcon />
      },
      {
        segment: "human-resources/reports",
        title: "HR Analytics & Reporting",
        icon: <AssessmentRoundedIcon />
      },
      {
        segment: "human-resources/jobs/catalog",
        title: "Job Catalog",
        icon: <MenuBookRoundedIcon />
      },
      {
        segment: "human-resources/jobs/positions",
        title: "Positions",
        icon: <AccountTreeRoundedIcon />
      }
    ]
  },
  {
    segment: "setup",
    title: "Setup",
    icon: <SettingsSuggestRoundedIcon />,
    children: [
      {
        segment: "finance",
        title: "Finance",
        icon: <AccountBalanceRoundedIcon />,
        children: [
          {
            segment: "banks",
            title: "Bank",
            icon: <AccountBalanceWalletRoundedIcon />
          },
          {
            segment: "bank-generals",
            title: "Bank General",
            icon: <SavingsRoundedIcon />
          },
          {
            segment: "bank-serial-checks",
            title: "Bank Serial Checks",
            icon: <TagRoundedIcon />
          },
          {
            segment: "chart-groups",
            title: "Account Groups",
            icon: <AccountTreeRoundedIcon />
          },
          {
            segment: "chart-of-accounts",
            title: "Chart of Accounts",
            icon: <ListAltRoundedIcon />
          },
          {
            segment: "account-mappings",
            title: "EPSA mapping logic",
            icon: <HubRoundedIcon />
          }
        ]
      },
      {
        segment: "hr",
        title: "HR",
        icon: <PeopleAltRoundedIcon />,
        children: [
          {
            segment: "time-sheet-codes",
            title: "Time Sheet Code",
            icon: <ScheduleRoundedIcon />
          },
          {
            segment: "holidays",
            title: "Holidays",
            icon: <EventAvailableRoundedIcon />
          }
        ]
      },
      {
        segment: "scm",
        title: "SCM",
        icon: <LocalShippingRoundedIcon />
      },
      {
        segment: "general",
        title: "General",
        icon: <TuneRoundedIcon />,
        children: [
          {
            segment: "location",
            title: "Location",
            icon: <LocationOnRoundedIcon />
          },
          {
            segment: "departments",
            title: "Departments",
            icon: <BusinessRoundedIcon />
          },
          {
            segment: "epsas",
            title: "EPSA's",
            icon: <ApartmentRoundedIcon />
          },
          {
            segment: "users",
            title: "Users",
            icon: <GroupRoundedIcon />
          },
          {
            segment: "workflow-config",
            title: "Workflow Config",
            icon: <StarRoundedIcon />,
            children: [
              {
                segment: "transaction-types",
                title: "Transaction Types",
                icon: <CategoryRoundedIcon />
              },
              {
                segment: "add-invoices",
                title: "Add Invoices",
                icon: <ReceiptLongRoundedIcon />
              },
              {
                segment: "workflow-setup",
                title: "Workflow Setup",
                icon: <AccountTreeRoundedIcon />
              }
            ]
          }
        ]
      }
    ]
  },
];
