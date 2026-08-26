import express from "express";
import {
  createJob,
  getJobById,
  getJobOptions,
  listJobs
} from "../../controllers/HR/job.controller";
import { authenticate } from "../../middleware/authenticate";

const router = express.Router();

router.get("/api/jobs/options", authenticate, getJobOptions);
router.get("/api/jobs", authenticate, listJobs);
router.get("/api/jobs/:jobId", authenticate, getJobById);
router.post("/api/jobs", authenticate, createJob);

export default router;
