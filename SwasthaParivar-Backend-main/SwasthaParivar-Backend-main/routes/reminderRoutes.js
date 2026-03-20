// routes/reminderRoutes.js
import express from "express";
import auth from "../middleware/auth.js";

import {
  createReminder,
  listReminders,
  getReminder,
  updateReminder,
  deleteReminder,
  softDeleteReminder,
  restoreReminder,
  triggerReminderNow
} from "../controllers/reminderController.js";

const router = express.Router();

// CREATE
router.post("/", auth, createReminder);

// LIST
router.get("/", auth, listReminders);

// SINGLE REMINDER
router.get("/:id", auth, getReminder);

// UPDATE
router.put("/:id", auth, updateReminder);

// DELETE (hard delete)
router.delete("/:id", auth, deleteReminder);

// ⭐ NEW — SOFT DELETE (undo-enabled)
router.post("/:id/soft-delete", auth, softDeleteReminder);

// ⭐ NEW — RESTORE (undo)
router.post("/:id/restore", auth, restoreReminder);

// MANUAL TRIGGER (debug)
router.post("/:id/trigger", auth, triggerReminderNow);

export default router;
