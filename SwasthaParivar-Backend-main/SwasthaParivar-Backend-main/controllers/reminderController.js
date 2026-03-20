import Reminder from "../models/remindermodel.js";
import mongoose from "mongoose";

/* ------------------ UTIL: COMPUTE NEXT RUN DATE ------------------ */
function computeNextRun(currentDate = new Date(), frequency, options = {}) {
  const next = new Date(currentDate);

  // Apply time (HH:mm)
  if (options.time) {
    const [hh, mm] = options.time.split(":").map(Number);
    next.setHours(hh ?? 9, mm ?? 0, 0, 0);
  }

  switch (frequency) {
    case "daily":
      next.setDate(next.getDate() + 1);
      break;

    case "weekly": {
      const target = typeof options.weekday === "number" ? options.weekday : next.getDay();
      const delta = (target - next.getDay() + 7) % 7 || 7;
      next.setDate(next.getDate() + delta);
      break;
    }

    case "monthly": {
      const dom = options.dayOfMonth || next.getDate();
      next.setMonth(next.getMonth() + 1);
      next.setDate(Math.min(dom, daysInMonth(next.getFullYear(), next.getMonth())));
      break;
    }

    case "yearly":
      next.setFullYear(next.getFullYear() + 1);
      break;

    case "once":
    default:
      break;
  }

  return next;
}

function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

/* ------------------ CREATE REMINDER ------------------ */
export const createReminder = async (req, res) => {
  try {
    const ownerId = req.user._id;

    const {
      title,
      description,
      category,
      memberId,
      frequency,
      options,
      nextRunAt,
      meta,
    } = req.body;

    // REQUIRED FIELDS
    if (!title) return res.status(400).json({ message: "Title required" });
    if (!category) return res.status(400).json({ message: "Category required" });

    let nextDate = nextRunAt
      ? new Date(nextRunAt)
      : computeNextRun(new Date(), frequency || "once", options || {});

    const rem = new Reminder({
      ownerId,
      memberId: memberId ? new mongoose.Types.ObjectId(memberId) : undefined,
      title,
      description,
      category, // 🔥 FIXED
      frequency: frequency || "once",
      options: options || {},
      nextRunAt: nextDate,
      meta: meta || {},
    });

    await rem.save();
    res.status(201).json({ reminder: rem });

  } catch (err) {
    console.error("createReminder:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ------------------ LIST REMINDERS ------------------ */
export const listReminders = async (req, res) => {
  try {
    const ownerId = req.user._id;
    const reminders = await Reminder.find({ ownerId }).sort({ nextRunAt: 1 });
    res.json({ reminders });
  } catch (err) {
    console.error("listReminders:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ------------------ GET SINGLE REMINDER ------------------ */
export const getReminder = async (req, res) => {
  try {
    const ownerId = req.user._id;
    const rem = await Reminder.findOne({ _id: req.params.id, ownerId });
    if (!rem) return res.status(404).json({ message: "Not found" });
    res.json({ reminder: rem });
  } catch (err) {
    console.error("getReminder:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ------------------ UPDATE REMINDER ------------------ */
export const updateReminder = async (req, res) => {
  try {
    const ownerId = req.user._id;
    const update = req.body;

    // If frequency/options changed, compute nextRunAt
    if ((update.frequency || update.options) && !update.nextRunAt) {
      update.nextRunAt = computeNextRun(
        new Date(),
        update.frequency || "once",
        update.options || {}
      );
    }

    const rem = await Reminder.findOneAndUpdate(
      { _id: req.params.id, ownerId },
      update,
      { new: true }
    );

    if (!rem) return res.status(404).json({ message: "Not found" });
    res.json({ reminder: rem });

  } catch (err) {
    console.error("updateReminder:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ------------------ DELETE REMINDER ------------------ */
export const deleteReminder = async (req, res) => {
  try {
    const ownerId = req.user._id;
    const rem = await Reminder.findOneAndDelete({
      _id: req.params.id,
      ownerId,
    });

    if (!rem) return res.status(404).json({ message: "Not found" });
    res.json({ message: "Deleted" });

  } catch (err) {
    console.error("deleteReminder:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ------------------ TRIGGER MANUALLY ------------------ */
export const triggerReminderNow = async (req, res) => {
  try {
    const ownerId = req.user._id;
    const rem = await Reminder.findOne({
      _id: req.params.id,
      ownerId,
    });

    if (!rem) return res.status(404).json({ message: "Not found" });

    rem.lastTriggeredAt = new Date();

    if (rem.frequency && rem.frequency !== "once") {
      rem.nextRunAt = computeNextRun(
        rem.nextRunAt || new Date(),
        rem.frequency,
        rem.options || {}
      );
    } else {
      rem.active = false;
    }

    await rem.save();
    res.json({ reminder: rem });

  } catch (err) {
    console.error("triggerReminderNow:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// soft delete
export const softDeleteReminder = async (req, res) => {
  try {
    const ownerId = req.user._id;
    const rem = await Reminder.findOneAndUpdate(
      { _id: req.params.id, ownerId },
      { active: false },
      { new: true }
    );
    if (!rem) return res.status(404).json({ message: "Not found" });
    res.json({ reminder: rem });
  } catch (err) { res.status(500).json({ message:"Server error" }); }
};

export const restoreReminder = async (req, res) => {
  try {
    const ownerId = req.user._id;
    const rem = await Reminder.findOneAndUpdate(
      { _id: req.params.id, ownerId },
      { active: true },
      { new: true }
    );
    if (!rem) return res.status(404).json({ message: "Not found" });
    res.json({ reminder: rem });
  } catch (err) { res.status(500).json({ message:"Server error" }); }
};

