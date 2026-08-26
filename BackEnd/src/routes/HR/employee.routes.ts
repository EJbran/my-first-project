import express from "express";
import {
  createEmployee,
  deleteEmployee,
  getEmployeeSearchOptions,
  getEmployeeById,
  listEmployees,
  searchEmployees,
  updateEmployee
} from "../../controllers/HR/employee.controller";
import { getEmployeeDashboard } from "../../controllers/HR/employeeDashboard.controller";
import { getEmployeeVacations } from "../../controllers/HR/vacation.controller";
import { authenticate } from "../../middleware/authenticate";

const router = express.Router();

router.get("/api/employees", authenticate, listEmployees);
router.get("/api/employees/dashboard", authenticate, getEmployeeDashboard);
router.get("/api/employees/search", authenticate, searchEmployees);
router.get("/api/employees/search-options", authenticate, getEmployeeSearchOptions);
router.post("/api/employees", authenticate, createEmployee);
router.put("/api/employees/:id", authenticate, updateEmployee);
router.delete("/api/employees/:id", authenticate, deleteEmployee);
router.get("/api/employees/:id/vacations", authenticate, getEmployeeVacations);
router.get("/api/employees/:id", authenticate, getEmployeeById);

export default router;
