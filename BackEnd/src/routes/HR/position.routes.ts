import express from "express";
import {
  assignEmployeeToPosition,
  createPosition,
  deletePosition,
  getCurrentEmployeePosition,
  getPositionById,
  getPositionOptions,
  listPositions,
  listVacantPositions,
  releaseEmployeePosition,
  transferEmployeePosition,
  updatePosition
} from "../../controllers/HR/position.controller";
import { authenticate } from "../../middleware/authenticate";

const router = express.Router();

router.get("/api/positions/vacant", authenticate, listVacantPositions);
router.get("/api/positions/options", authenticate, getPositionOptions);
router.get(
  "/api/positions/employees/:employeeId/current",
  authenticate,
  getCurrentEmployeePosition
);
router.post("/api/positions/assign", authenticate, assignEmployeeToPosition);
router.post("/api/positions/transfer", authenticate, transferEmployeePosition);
router.post("/api/positions/release", authenticate, releaseEmployeePosition);
router.get("/api/positions", authenticate, listPositions);
router.get("/api/positions/:positionId", authenticate, getPositionById);
router.post("/api/positions", authenticate, createPosition);
router.put("/api/positions/:positionId", authenticate, updatePosition);
router.delete("/api/positions/:positionId", authenticate, deletePosition);

export default router;
