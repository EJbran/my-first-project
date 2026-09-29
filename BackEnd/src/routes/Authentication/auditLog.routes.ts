import express from "express";
import { listAssetAuditLogs } from "../../controllers/Authentication/auditLog.controller";
import { authenticate } from "../../middleware/authenticate";

const router = express.Router();

router.get("/api/audit-logs", authenticate, listAssetAuditLogs);

export default router;