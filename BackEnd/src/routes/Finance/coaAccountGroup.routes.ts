import express from "express";
import {
  createCoaAccountGroup,
  deleteCoaAccountGroup,
  getCoaAccountGroupById,
  listCoaAccountGroups,
  updateCoaAccountGroup
} from "../../controllers/Finance/coaAccountGroup.controller";

const router = express.Router();

router.get("/api/chart-groups", listCoaAccountGroups);
router.get("/api/chart-groups/:id", getCoaAccountGroupById);
router.post("/api/chart-groups", createCoaAccountGroup);
router.put("/api/chart-groups/:id", updateCoaAccountGroup);
router.delete("/api/chart-groups/:id", deleteCoaAccountGroup);

export default router;
