import express from "express";
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
router.post("/api/assets", createAsset);
router.put("/api/assets/:id", updateAsset);
router.delete("/api/assets/:id", deleteAsset);

export default router;
