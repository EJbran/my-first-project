import express from "express";
import {
  createCategoryAttributes,
  deleteCategoryAttributes,
  getCategoryAttributesById,
  listCategoryAttributes,
  updateCategoryAttributes
} from "../../controllers/Finance/categoryAttributes.controller";

const router = express.Router();

router.get("/api/category-attributes", listCategoryAttributes);
router.get("/api/category-attributes/:id", getCategoryAttributesById);
router.post("/api/category-attributes", createCategoryAttributes);
router.put("/api/category-attributes/:id", updateCategoryAttributes);
router.delete("/api/category-attributes/:id", deleteCategoryAttributes);

export default router;
