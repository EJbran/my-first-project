import express from "express";
import {
  createTimeSheetCode,
  deleteTimeSheetCode,
  getTimeSheetCodeById,
  listTimeSheetCodes,
  updateTimeSheetCode
} from "../../controllers/HR/timeSheetCode.controller";

const router = express.Router();

router.get("/api/time-sheet-codes", listTimeSheetCodes);
router.get("/api/time-sheet-codes/:id", getTimeSheetCodeById);
router.post("/api/time-sheet-codes", createTimeSheetCode);
router.put("/api/time-sheet-codes/:id", updateTimeSheetCode);
router.delete("/api/time-sheet-codes/:id", deleteTimeSheetCode);

export default router;
