import express from "express";
import {
  createSubLocation,
  deleteSubLocation,
  getSubLocationById,
  listSubLocations,
  updateSubLocation
} from "../../controllers/HR/General/subLocation.controller";

const router = express.Router();

router.get("/api/sub-locations", listSubLocations);
router.get("/api/sub-locations/:id", getSubLocationById);
router.post("/api/sub-locations", createSubLocation);
router.put("/api/sub-locations/:id", updateSubLocation);
router.delete("/api/sub-locations/:id", deleteSubLocation);

export default router;
