import express from "express";
import {
  createBank,
  deleteBank,
  getBankById,
  listBanks,
  updateBank
} from "../../controllers/Finance/bank.controller";

const router = express.Router();

router.get("/api/banks", listBanks);
router.get("/api/banks/:id", getBankById);
router.post("/api/banks", createBank);
router.put("/api/banks/:id", updateBank);
router.delete("/api/banks/:id", deleteBank);

export default router;
