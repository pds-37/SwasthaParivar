import express from "express";
import auth from "../middleware/auth.js";
import { saveSubscription, testNotification } from "../controllers/notificationController.js";
import { validate } from "../middleware/validate.js";
import { notificationSubscriptionSchema } from "../validations/notificationSchemas.js";

const router = express.Router();

router.post("/notifications/subscribe", auth, validate(notificationSubscriptionSchema), saveSubscription);
router.get("/notifications/test", auth, testNotification);

export default router;
