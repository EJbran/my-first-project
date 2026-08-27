import { Suspense } from "react";
import { createBrowserRouter, Navigate, type RouteObject } from "react-router-dom";
import App from "../App";
import LoginPage from "../pages/LoginPage";
import EmployeeLinkRequiredPage from "../pages/EmployeeLinkRequiredPage";
import SigningInPage from "../pages/SigningInPage";
import DashboardPage from "../pages/DashboardPage";
import NotFoundPage from "../pages/NotFoundPage";
import ForbiddenPage from "../pages/ForbiddenPage";
import UsersPage from "../pages/users/UsersPage";
import UserDetailsPage from "../pages/users/UserDetailsPage";
import RolesPage from "../pages/roles/RolesPage";
import RoleDetailsPage from "../pages/roles/RoleDetailsPage";
import PermissionsPage from "../pages/permissions/PermissionsPage";
import PermissionGroupsPage from "../pages/permissionGroups/PermissionGroupsPage";
import AuthDomainsPage from "../pages/authDomains/AuthDomainsPage";
import AdGroupRoleMappingsPage from "../pages/adGroups/AdGroupRoleMappingsPage";
import UserSessionsPage from "../pages/sessions/UserSessionsPage";
import LoginAttemptsPage from "../pages/loginAttempts/LoginAttemptsPage";
import AuditLogsPage from "../pages/auditLogs/AuditLogsPage";
import AccessRequestsPage from "../pages/accessRequests/AccessRequestsPage";
import AccessRequestDetailsPage from "../pages/accessRequests/AccessRequestDetailsPage";
import DelegationsPage from "../pages/delegations/DelegationsPage";
import SecurityPoliciesPage from "../pages/securityPolicies/SecurityPoliciesPage";
import UserDevicesPage from "../pages/devices/UserDevicesPage";
import ApiClientsPage from "../pages/apiClients/ApiClientsPage";
import LocationPage from "../pages/general/LocationPage";
import DepartmentsPage from "../pages/general/DepartmentsPage";
import EpsasPage from "../pages/general/EpsasPage";
import BanksPage from "../pages/setup/finance/BanksPage";
import BankGeneralsPage from "../pages/setup/finance/BankGeneralsPage";
import BankSerialChecksPage from "../pages/setup/finance/BankSerialChecksPage";
import ChartGroupsPage from "../pages/setup/finance/ChartGroupsPage";
import ChartOfAccountsPage from "../pages/setup/finance/ChartOfAccountsPage";
import AccountMappingsPage from "../pages/setup/finance/AccountMappingsPage";
import AssetCategoriesPage from "../pages/setup/finance/AssetCategoriesPage";
import AssetsPage from "../pages/setup/finance/AssetsPage";
import TimeSheetCodesPage from "../pages/setup/hr/TimeSheetCodesPage";
import HolidaysPage from "../pages/setup/hr/HolidaysPage";
import AFEsPage from "../pages/afe/AFEsPage";
import HumanResourcesPage from "../pages/hr/HumanResourcesPage";
import HumanResourcesModulePage from "../pages/hr/HumanResourcesModulePage";
import TimesheetsPage from "../pages/hr/Time_Attendence/TimesheetsPage";
import EmployeesPage from "../pages/hr/employee-profile/EmployeesPage";
import EmployeeProfilePage from "../pages/hr/employee-profile/EmployeeProfilePage";
import HRDashboardPage from "../pages/hr/jobs/HRDashboardPage";
import ReportsPage from "../pages/hr/jobs/ReportsPage";
import { LazyJobCatalogPage, LazyJobProfilePage, LazyPositionsPage } from "../pages/hr/jobs/LazyCatalogPages";
import { LoadingScreen } from "../components/LoadingScreen";
import { PermissionGuard } from "../auth/PermissionGuard";



import MahaSassiPage from "../pages/general/MahaSassiPage";
import TransactionTypeFormPage from "../pages/general/TransactionTypeFormPage";
import WorkflowSetupPage from "../pages/general/WorkflowSetupPage";
import WorkflowSetupFormPage from "../pages/general/WorkflowSetupFormPage";
import AddInvoicesPage from "../pages/general/AddInvoicesPage";



const routes: RouteObject[] = [
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: "login", element: <LoginPage /> },
      { path: "employee-link-required", element: <EmployeeLinkRequiredPage /> },
      { path: "signing-in", element: <SigningInPage /> },
      { path: "dashboard", element: <DashboardPage /> },
      {
        path: "users",
        element: (
          <PermissionGuard allOf={["security.users.read"]}>
            <UsersPage />
          </PermissionGuard>
        )
      },
      {
        path: "users/:id",
        element: (
          <PermissionGuard allOf={["security.users.read"]}>
            <UserDetailsPage />
          </PermissionGuard>
        )
      },
      {
        path: "roles",
        element: (
          <PermissionGuard allOf={["security.roles.read"]}>
            <RolesPage />
          </PermissionGuard>
        )
      },
      {
        path: "roles/:id",
        element: (
          <PermissionGuard allOf={["security.roles.read"]}>
            <RoleDetailsPage />
          </PermissionGuard>
        )
      },
      {
        path: "permissions",
        element: (
          <PermissionGuard allOf={["security.permissions.read"]}>
            <PermissionsPage />
          </PermissionGuard>
        )
      },
      {
        path: "permission-groups",
        element: (
          <PermissionGuard allOf={["security.permission_groups.manage"]}>
            <PermissionGroupsPage />
          </PermissionGuard>
        )
      },
      {
        path: "auth-domains",
        element: (
          <PermissionGuard allOf={["security.auth_domains.manage"]}>
            <AuthDomainsPage />
          </PermissionGuard>
        )
      },
      {
        path: "ad-group-role-mappings",
        element: (
          <PermissionGuard allOf={["security.ad_groups.manage"]}>
            <AdGroupRoleMappingsPage />
          </PermissionGuard>
        )
      },
      {
        path: "sessions",
        element: (
          <PermissionGuard allOf={["security.sessions.read"]}>
            <UserSessionsPage />
          </PermissionGuard>
        )
      },
      {
        path: "login-attempts",
        element: (
          <PermissionGuard allOf={["security.login_attempts.read"]}>
            <LoginAttemptsPage />
          </PermissionGuard>
        )
      },
      {
        path: "audit-logs",
        element: (
          <PermissionGuard allOf={["security.audit.read"]}>
            <AuditLogsPage />
          </PermissionGuard>
        )
      },
      {
        path: "access-requests",
        element: (
          <PermissionGuard allOf={["security.access_requests.read"]}>
            <AccessRequestsPage />
          </PermissionGuard>
        )
      },
      {
        path: "access-requests/:id",
        element: (
          <PermissionGuard allOf={["security.access_requests.read"]}>
            <AccessRequestDetailsPage />
          </PermissionGuard>
        )
      },
      {
        path: "delegations",
        element: (
          <PermissionGuard allOf={["security.delegations.manage"]}>
            <DelegationsPage />
          </PermissionGuard>
        )
      },
      {
        path: "security-policies",
        element: (
          <PermissionGuard allOf={["security.policies.manage"]}>
            <SecurityPoliciesPage />
          </PermissionGuard>
        )
      },
      {
        path: "devices",
        element: (
          <PermissionGuard allOf={["security.devices.manage"]}>
            <UserDevicesPage />
          </PermissionGuard>
        )
      },
      {
        path: "api-clients",
        element: (
          <PermissionGuard allOf={["security.api_clients.manage"]}>
            <ApiClientsPage />
          </PermissionGuard>
        )
      },
      { path: "setup/finance/banks", element: <BanksPage /> },
      { path: "setup/finance/bank-generals", element: <BankGeneralsPage /> },
      { path: "setup/finance/bank-serial-checks", element: <BankSerialChecksPage /> },
      { path: "setup/finance/chart-groups", element: <ChartGroupsPage /> },
      { path: "setup/finance/chart-of-accounts", element: <ChartOfAccountsPage /> },
      { path: "setup/finance/account-mappings", element: <AccountMappingsPage /> },
      { path: "setup/finance/asset-categories", element: <AssetCategoriesPage /> },
      { path: "setup/finance/assets", element: <AssetsPage /> },
      { path: "setup/hr/time-sheet-codes", element: <TimeSheetCodesPage /> },
      { path: "setup/hr/holidays", element: <HolidaysPage /> },
      { path: "afe/afes", element: <AFEsPage /> },
      { path: "human-resources", element: <HumanResourcesPage /> },
      {
        path: "human-resources/onboarding",
        element: <HumanResourcesModulePage title="Onboarding" />
      },
      {
        path: "human-resources/timesheets-attendance",
        element: <HumanResourcesModulePage title="Timesheets & Attendance" />
      },
      {
        path: "human-resources/timesheets-attendance/timesheets",
        element: <TimesheetsPage />
      },
      {
        path: "human-resources/leave-management",
        element: <HumanResourcesModulePage title="Leave Management" />
      },
      {
        path: "human-resources/compensation-benefits",
        element: <HumanResourcesModulePage title="Compensation & Benefits" />
      },
      {
        path: "human-resources/performance-management",
        element: <HumanResourcesModulePage title="Performance Management" />
      },
      {
        path: "human-resources/offboarding",
        element: <HumanResourcesModulePage title="Offboarding" />
      },
      {
        path: "human-resources/hr-analytics-reporting",
        element: <HumanResourcesModulePage title="HR Analytics & Reporting" />
      },
      { path: "setup/general/location", element: <LocationPage /> },
      { path: "setup/general/departments", element: <DepartmentsPage /> },
      { path: "setup/general/epsas", element: <EpsasPage /> },
      { path: "human-resources/employees/employees-list", element: <EmployeesPage /> },
      { path: "human-resources/employees/employee-profile/:employeeId", element: <EmployeeProfilePage /> },
      { path: "human-resources/hr-dashboard", element: <HRDashboardPage /> },
      { path: "human-resources/reports", element: <ReportsPage /> },
      { path: "human-resources/jobs", element: <Navigate to="/human-resources/jobs/catalog" replace /> },
      {
        path: "human-resources/jobs/catalog",
        element: (
          <Suspense fallback={<LoadingScreen message="Loading job catalog..." />}>
            <LazyJobCatalogPage />
          </Suspense>
        )
      },
      {
        path: "human-resources/jobs/catalog/:jobId",
        element: (
          <Suspense fallback={<LoadingScreen message="Loading job profile..." />}>
            <LazyJobProfilePage />
          </Suspense>
        )
      },
      {
        path: "human-resources/jobs/positions/:positionId?",
        element: (
          <Suspense fallback={<LoadingScreen message="Loading positions..." />}>
            <LazyPositionsPage />
          </Suspense>
        )
      },




      { path: "setup/general/workflow-config/transaction-types", element: <MahaSassiPage /> },
      { path: "setup/general/workflow-config/transaction-types/new", element: <TransactionTypeFormPage /> },
      { path: "setup/general/workflow-config/transaction-types/:id/edit", element: <TransactionTypeFormPage /> },
      { path: "setup/general/workflow-config/add-invoices", element: <AddInvoicesPage /> },
      { path: "setup/general/workflow-config/workflow-setup", element: <WorkflowSetupPage /> },
      { path: "setup/general/workflow-config/workflow-setup/new", element: <WorkflowSetupFormPage /> },



      { path: "403", element: <ForbiddenPage /> },
      { path: "*", element: <NotFoundPage /> }
    ]
  }
];

export const router = createBrowserRouter(routes);
