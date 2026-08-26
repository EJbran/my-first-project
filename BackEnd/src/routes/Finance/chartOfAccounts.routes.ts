import express from "express";
import {
  createChartOfAccounts,
  deleteChartOfAccounts,
  getChartOfAccountsById,
  listChartOfAccounts,
  updateChartOfAccounts
} from "../../controllers/Finance/chartOfAccounts.controller";

const router = express.Router();

router.get("/api/chart-of-accounts", listChartOfAccounts);
router.get("/api/chart-of-accounts/:id", getChartOfAccountsById);
router.post("/api/chart-of-accounts", createChartOfAccounts);
router.put("/api/chart-of-accounts/:id", updateChartOfAccounts);
router.delete("/api/chart-of-accounts/:id", deleteChartOfAccounts);

export default router;
