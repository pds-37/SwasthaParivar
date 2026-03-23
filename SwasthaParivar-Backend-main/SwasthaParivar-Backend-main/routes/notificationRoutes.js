import express from "express";
import auth from "../middleware/auth.js";
import { saveSubscription } from "../controllers/notificationController.js";
import { validate } from "../middleware/validate.js";
import { notificationSubscriptionSchema } from "../validations/notificationSchemas.js";

const router = express.Router();

router.post("/notifications/subscribe", auth, validate(notificationSubscriptionSchema), saveSubscription);

export default router;
