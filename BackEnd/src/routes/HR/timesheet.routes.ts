import express from "express";
import {
  listTimesheets,
  saveTimesheets
} from "../../controllers/HR/timesheet.controller";
import { authenticate } from "../../middleware/authenticate";

const router = express.Router();

router.get("/api/timesheets", authenticate, listTimesheets);
router.post("/api/timesheets", authenticate, saveTimesheets);
router.post("/api/timesheets/save", authenticate, saveTimesheets);

export default router;
