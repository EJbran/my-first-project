import express from "express";
import {
  createHoliday,
  deleteHoliday,
  getHolidayById,
  listHolidays,
  updateHoliday
} from "../../controllers/HR/holiday.controller";

const router = express.Router();

router.get("/api/holidays", listHolidays);
router.get("/api/holidays/:id", getHolidayById);
router.post("/api/holidays", createHoliday);
router.put("/api/holidays/:id", updateHoliday);
router.delete("/api/holidays/:id", deleteHoliday);

export default router;
