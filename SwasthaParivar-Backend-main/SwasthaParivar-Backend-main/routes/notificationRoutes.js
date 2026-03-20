import express from "express";
import auth from "../middleware/auth.js";
import { saveSubscription } from "../controllers/notificationController.js";

const router = express.Router();

// ⭐ Save Push Subscription Route
router.post("/notifications/subscribe", auth, saveSubscription);

export default router;
