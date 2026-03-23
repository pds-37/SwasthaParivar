import express from "express";
import authController from "../controllers/AuthController.js";
import auth from "../middleware/auth.js";
import { authRateLimiter, googleAuthRateLimiter } from "../middleware/rateLimiter.js";
import { validate } from "../middleware/validate.js";
import { loginSchema, signupSchema } from "../validations/authSchemas.js";
const router = express.Router();

router.post("/signup", authRateLimiter.middleware(), validate(signupSchema), (req, res) => authController.signup(req, res));
router.post("/login", authRateLimiter.middleware(), validate(loginSchema), (req, res) => authController.login(req, res));
router.get("/google/start", googleAuthRateLimiter.middleware(), (req, res) => authController.googleStart(req, res));
router.get("/google/callback", googleAuthRateLimiter.middleware(), (req, res) => authController.googleCallback(req, res));
router.post("/refresh", (req, res) => authController.refresh(req, res));
router.post("/logout", (req, res) => authController.logout(req, res));
router.get("/session", auth, (req, res) => authController.session(req, res));

export default router;
