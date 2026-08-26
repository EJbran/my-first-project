import express from "express";
import {
  createDepartment,
  deleteDepartment,
  getDepartmentById,
  getDepartmentHierarchyLeaders,
  listDepartments,
  updateDepartment
} from "../../controllers/HR/General/department.controller";
import { authenticate } from "../../middleware/authenticate";

const router = express.Router();

router.get("/api/departments", listDepartments);
router.get(
  "/api/departments/hierarchy-leaders",
  authenticate,
  getDepartmentHierarchyLeaders
);
router.get("/api/departments/:id", getDepartmentById);
router.post("/api/departments", createDepartment);
router.put("/api/departments/:id", updateDepartment);
router.delete("/api/departments/:id", deleteDepartment);

export default router;
