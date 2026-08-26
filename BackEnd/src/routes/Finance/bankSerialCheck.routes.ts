import express from "express";
import {
  createBankSerialCheck,
  deleteBankSerialCheck,
  getBankSerialCheckById,
  listBankSerialChecks,
  updateBankSerialCheck
} from "../../controllers/Finance/bankSerialCheck.controller";

const router = express.Router();

router.get("/api/bank-serial-checks", listBankSerialChecks);
router.get("/api/bank-serial-checks/:id", getBankSerialCheckById);
router.post("/api/bank-serial-checks", createBankSerialCheck);
router.put("/api/bank-serial-checks/:id", updateBankSerialCheck);
router.delete("/api/bank-serial-checks/:id", deleteBankSerialCheck);

export default router;
