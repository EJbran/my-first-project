import express from "express";
import {
  createAdGroupRoleMapping,
  deleteAdGroupRoleMapping,
  getAdGroupRoleMappingById,
  listAdGroupRoleMappings,
  updateAdGroupRoleMapping,
  updateAdGroupRoleMappingStatus
} from "../../controllers/Authentication/adGroupRoleMapping.controller";

const router = express.Router();

router.get("/api/ad-group-role-mappings", listAdGroupRoleMappings);
router.get("/api/ad-group-role-mappings/:id", getAdGroupRoleMappingById);
router.post("/api/ad-group-role-mappings", createAdGroupRoleMapping);
router.put("/api/ad-group-role-mappings/:id", updateAdGroupRoleMapping);
router.patch("/api/ad-group-role-mappings/:id/status", updateAdGroupRoleMappingStatus);
router.delete("/api/ad-group-role-mappings/:id", deleteAdGroupRoleMapping);

export default router;
