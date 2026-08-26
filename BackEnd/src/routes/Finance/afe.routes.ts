import express from "express";
import {
  createAFEHandler,
  getAFEByIdHandler,
  listAFEsHandler,
  updateAFEHandler,
  updateAFEStatusHandler
} from "../../controllers/Finance/afe.controller";

const router = express.Router();

// TODO: wire finance.afe.read / create / update / deactivate permissions when available.
router.get("/api/finance/afe", listAFEsHandler);
router.get("/api/finance/afe/:id", getAFEByIdHandler);
router.post("/api/finance/afe", createAFEHandler);
router.put("/api/finance/afe/:id", updateAFEHandler);
router.patch("/api/finance/afe/:id/status", updateAFEStatusHandler);

export default router;
