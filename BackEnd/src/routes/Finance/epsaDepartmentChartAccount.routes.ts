import express from "express";
import {
  createAccountMappings,
  deleteAccountMapping,
  getAccountMappingById,
  listAccountMappings,
  updateAccountMapping
} from "../../controllers/Finance/epsaDepartmentChartAccount.controller";

const router = express.Router();

router.get("/api/account-mappings", listAccountMappings);
router.get("/api/account-mappings/:id", getAccountMappingById);
router.post("/api/account-mappings", createAccountMappings);
router.put("/api/account-mappings/:id", updateAccountMapping);
router.delete("/api/account-mappings/:id", deleteAccountMapping);

export default router;
