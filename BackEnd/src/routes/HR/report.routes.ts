import express from "express";
import { getMonthlySeniorityAwardReport } from "../../controllers/HR/seniorityAwardReport.controller";
import { authenticate } from "../../middleware/authenticate";

const router = express.Router();

router.get("/api/reports/seniority-awards", authenticate, getMonthlySeniorityAwardReport);

export default router;
