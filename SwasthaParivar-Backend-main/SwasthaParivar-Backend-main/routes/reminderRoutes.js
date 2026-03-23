import express from "express";
import auth from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  createReminder,
  deleteReminder,
  getReminder,
  listReminders,
  restoreReminder,
  softDeleteReminder,
  triggerReminderNow,
  updateReminder,
} from "../controllers/reminderController.js";
import {
  reminderBodySchema,
  reminderListQuerySchema,
  reminderParamsSchema,
  updateReminderSchema,
} from "../validations/reminderSchemas.js";

const router = express.Router();

router.post("/", auth, validate(reminderBodySchema), createReminder);
router.get("/", auth, validate(reminderListQuerySchema, "query"), listReminders);
router.get("/:id", auth, validate(reminderParamsSchema, "params"), getReminder);
router.put(
  "/:id",
  auth,
  validate(reminderParamsSchema, "params"),
  validate(updateReminderSchema),
  updateReminder
);
router.delete("/:id", auth, validate(reminderParamsSchema, "params"), deleteReminder);
router.post("/:id/soft-delete", auth, validate(reminderParamsSchema, "params"), softDeleteReminder);
router.post("/:id/restore", auth, validate(reminderParamsSchema, "params"), restoreReminder);
router.post("/:id/trigger", auth, validate(reminderParamsSchema, "params"), triggerReminderNow);

export default router;
