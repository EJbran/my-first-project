import express from "express";
import {
  createLocation,
  deleteLocation,
  getLocationById,
  listLocations,
  updateLocation
} from "../../controllers/HR/General/location.controller";

const router = express.Router();

router.get("/api/locations", listLocations);
router.get("/api/locations/:id", getLocationById);
router.post("/api/locations", createLocation);
router.put("/api/locations/:id", updateLocation);
router.delete("/api/locations/:id", deleteLocation);

export default router;
