import express from "express";
import { getOrganizationHierarchy } from "../../controllers/HR/organization.controller";
import { authenticate } from "../../middleware/authenticate";

const router = express.Router();

router.get(
  "/api/organization/hierarchy",
  authenticate,
  getOrganizationHierarchy
);

export default router;
