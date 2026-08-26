import express from "express";
import {
  createBankGeneral,
  deleteBankGeneral,
  getBankGeneralById,
  listBankGenerals,
  updateBankGeneral
} from "../../controllers/Finance/bankGeneral.controller";

const router = express.Router();

router.get("/api/bank-generals", listBankGenerals);
router.get("/api/bank-generals/:id", getBankGeneralById);
router.post("/api/bank-generals", createBankGeneral);
router.put("/api/bank-generals/:id", updateBankGeneral);
router.delete("/api/bank-generals/:id", deleteBankGeneral);

export default router;
