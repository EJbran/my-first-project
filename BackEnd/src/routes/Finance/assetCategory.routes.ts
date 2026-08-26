import express from "express";
import {
  createAssetCategory,
  deleteAssetCategory,
  getAssetCategoryById,
  listAssetCategories,
  updateAssetCategory
} from "../../controllers/Finance/assetCategory.controller";

const router = express.Router();

router.get("/api/asset-categories", listAssetCategories);
router.get("/api/asset-categories/:id", getAssetCategoryById);
router.post("/api/asset-categories", createAssetCategory);
router.put("/api/asset-categories/:id", updateAssetCategory);
router.delete("/api/asset-categories/:id", deleteAssetCategory);

export default router;
