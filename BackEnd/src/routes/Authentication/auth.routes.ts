import express from "express";
import {
  localLoginHandler,
  logoutCurrentSession,
  me,
  refresh,
  ssoCallback
} from "../../controllers/Authentication/auth.controller";
import { authenticate } from "../../middleware/authenticate";

const router = express.Router();

router.get("/api/auth/me", authenticate, me);
router.post("/api/auth/logout", authenticate, logoutCurrentSession);
router.post("/api/auth/refresh", refresh);
router.post("/api/auth/local-login", localLoginHandler);
router.post("/api/auth/sso/callback", ssoCallback);

export default router;
