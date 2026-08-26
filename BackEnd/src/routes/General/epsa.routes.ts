import express from "express";
import {
  createEpsa,
  deleteEpsa,
  getEpsaById,
  listEpsas,
  updateEpsa
} from "../../controllers/HR/General/epsa.controller";

const router = express.Router();

router.get("/api/epsas", listEpsas);
router.get("/api/epsas/:id", getEpsaById);
router.post("/api/epsas", createEpsa);
router.put("/api/epsas/:id", updateEpsa);
router.delete("/api/epsas/:id", deleteEpsa);

export default router;
