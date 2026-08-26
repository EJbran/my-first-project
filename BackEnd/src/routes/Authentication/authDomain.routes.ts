import express from "express";
import {
  createAuthDomain,
  deleteAuthDomain,
  getAuthDomainById,
  listAuthDomains,
  updateAuthDomain,
  updateAuthDomainStatus
} from "../../controllers/Authentication/authDomain.controller";

const router = express.Router();

router.get("/api/auth-domains", listAuthDomains);
router.get("/api/auth-domains/:id", getAuthDomainById);
router.post("/api/auth-domains", createAuthDomain);
router.put("/api/auth-domains/:id", updateAuthDomain);
router.patch("/api/auth-domains/:id/status", updateAuthDomainStatus);
router.delete("/api/auth-domains/:id", deleteAuthDomain);

export default router;
