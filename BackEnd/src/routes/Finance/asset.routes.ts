import express from "express";
import { authenticate } from "../../middleware/authenticate";
import {
  createAsset,
  deleteAsset,
  getAssetById,
  listAssets,
  updateAsset
} from "../../controllers/Finance/asset.controller";

const router = express.Router();

router.get("/api/assets", listAssets);
router.get("/api/assets/:id", getAssetById);
router.post("/api/assets", authenticate, createAsset);
router.put("/api/assets/:id", authenticate, updateAsset);
router.delete("/api/assets/:id", authenticate, deleteAsset);

export default router;
