import mongoose from "mongoose";
import Reminder from "../models/remindermodel.js";
import householdService from "../services/household/HouseholdService.js";
import { sendError, sendSuccess } from "../utils/apiResponse.js";
import { buildPaginationMeta, parsePagination } from "../utils/pagination.js";

function computeNextRun(currentDate = new Date(), frequency, options = {}) {
  const next = new Date(currentDate);

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
      next.setDate(Math.min(dom, new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()));
      break;
    }
    case "yearly":
      next.setFullYear(next.getFullYear() + 1);
      break;
    default:
      break;
  }

  return next;
}

const buildReminderScope = (householdId, ownerId) => {
  if (!householdId) {
    return { ownerId, deletedAt: null };
  }

  return {
    deletedAt: null,
    $or: [
      { householdId },
      { ownerId, householdId: null },
    ],
  };
};

const ensureMemberAccess = async (userId, memberId) => {
  if (!memberId) return true;
  if (!mongoose.Types.ObjectId.isValid(memberId)) return false;

  const result = await householdService.findAccessibleMember(userId, memberId);
  return Boolean(result?.member);
};

export const createReminder = async (req, res) => {
  try {
    const ownerId = req.user._id;
    const householdContext = await householdService.ensureUserHouseholdContext(ownerId);
    const { title, description, category, memberId, frequency, options, nextRunAt, meta } = req.body;

    if (!(await ensureMemberAccess(ownerId, memberId))) {
      return sendError(res, {
        status: 404,
        code: "MEMBER_NOT_FOUND",
        message: "Selected family member was not found",
      });
    }

    const nextDate = nextRunAt
      ? new Date(nextRunAt)
      : computeNextRun(new Date(), frequency || "once", options || {});

    const reminder = await Reminder.create({
      ownerId,
      householdId: householdContext?.household?._id || null,
      memberId: memberId ? new mongoose.Types.ObjectId(memberId) : undefined,
      title,
      description,
      category,
      frequency: frequency || "once",
      options: options || {},
      nextRunAt: nextDate,
      meta: meta || {},
    });

    return sendSuccess(res, {
      status: 201,
      data: reminder,
    });
  } catch (error) {
    return sendError(res, {
      status: 500,
      code: "REMINDER_CREATE_FAILED",
      message: "Could not create reminder",
      details: error.message,
    });
  }
};

export const listReminders = async (req, res) => {
  try {
    const ownerId = req.user._id;
    const householdContext = await householdService.ensureUserHouseholdContext(ownerId);
    const pagination = parsePagination(req.query);
    const filter = buildReminderScope(householdContext?.household?._id || null, ownerId);
    const [reminders, total] = await Promise.all([
      Reminder.find(filter).sort({ nextRunAt: 1 }).skip(pagination.skip).limit(pagination.limit),
      Reminder.countDocuments(filter),
    ]);

    return sendSuccess(res, {
      data: reminders,
      meta: buildPaginationMeta({ ...pagination, total }),
    });
  } catch (error) {
    return sendError(res, {
      status: 500,
      code: "REMINDER_LIST_FAILED",
      message: "Could not load reminders",
      details: error.message,
    });
  }
};

export const getReminder = async (req, res) => {
  try {
    const householdContext = await householdService.ensureUserHouseholdContext(req.user._id);
    const reminder = await Reminder.findOne({
      _id: req.params.id,
      ...buildReminderScope(householdContext?.household?._id || null, req.user._id),
    });

    if (!reminder) {
      return sendError(res, {
        status: 404,
        code: "REMINDER_NOT_FOUND",
        message: "Reminder not found",
      });
    }

    return sendSuccess(res, { data: reminder });
  } catch (error) {
    return sendError(res, {
      status: 500,
      code: "REMINDER_FETCH_FAILED",
      message: "Could not load reminder",
      details: error.message,
    });
  }
};

export const updateReminder = async (req, res) => {
  try {
    const ownerId = req.user._id;
    const householdContext = await householdService.ensureUserHouseholdContext(ownerId);
    const update = { ...req.body };

    if (update.memberId && !(await ensureMemberAccess(ownerId, update.memberId))) {
      return sendError(res, {
        status: 404,
        code: "MEMBER_NOT_FOUND",
        message: "Selected family member was not found",
      });
    }

    if ((update.frequency || update.options) && !update.nextRunAt) {
      update.nextRunAt = computeNextRun(new Date(), update.frequency || "once", update.options || {});
    }

    const reminder = await Reminder.findOneAndUpdate(
      { _id: req.params.id, ...buildReminderScope(householdContext?.household?._id || null, ownerId) },
      update,
      { new: true }
    );

    if (!reminder) {
      return sendError(res, {
        status: 404,
        code: "REMINDER_NOT_FOUND",
        message: "Reminder not found",
      });
    }

    return sendSuccess(res, { data: reminder });
  } catch (error) {
    return sendError(res, {
      status: 500,
      code: "REMINDER_UPDATE_FAILED",
      message: "Could not update reminder",
      details: error.message,
    });
  }
};

export const deleteReminder = async (req, res) => {
  try {
    const householdContext = await householdService.ensureUserHouseholdContext(req.user._id);
    const reminder = await Reminder.findOneAndDelete({
      _id: req.params.id,
      ...buildReminderScope(householdContext?.household?._id || null, req.user._id),
    });

    if (!reminder) {
      return sendError(res, {
        status: 404,
        code: "REMINDER_NOT_FOUND",
        message: "Reminder not found",
      });
    }

    return sendSuccess(res, {
      data: { id: reminder._id, deleted: true },
    });
  } catch (error) {
    return sendError(res, {
      status: 500,
      code: "REMINDER_DELETE_FAILED",
      message: "Could not delete reminder",
      details: error.message,
    });
  }
};

export const triggerReminderNow = async (req, res) => {
  try {
    const householdContext = await householdService.ensureUserHouseholdContext(req.user._id);
    const reminder = await Reminder.findOne({
      _id: req.params.id,
      ...buildReminderScope(householdContext?.household?._id || null, req.user._id),
    });

    if (!reminder) {
      return sendError(res, {
        status: 404,
        code: "REMINDER_NOT_FOUND",
        message: "Reminder not found",
      });
    }

    reminder.lastTriggeredAt = new Date();
    if (reminder.frequency && reminder.frequency !== "once") {
      reminder.nextRunAt = computeNextRun(
        reminder.nextRunAt || new Date(),
        reminder.frequency,
        reminder.options || {}
      );
    } else {
      reminder.active = false;
    }

    await reminder.save();
    return sendSuccess(res, { data: reminder });
  } catch (error) {
    return sendError(res, {
      status: 500,
      code: "REMINDER_TRIGGER_FAILED",
      message: "Could not trigger reminder",
      details: error.message,
    });
  }
};

export const softDeleteReminder = async (req, res) => {
  try {
    const householdContext = await householdService.ensureUserHouseholdContext(req.user._id);
    const reminder = await Reminder.findOneAndUpdate(
      { _id: req.params.id, ...buildReminderScope(householdContext?.household?._id || null, req.user._id) },
      { active: false, deletedAt: new Date() },
      { new: true }
    );

    if (!reminder) {
      return sendError(res, {
        status: 404,
        code: "REMINDER_NOT_FOUND",
        message: "Reminder not found",
      });
    }

    return sendSuccess(res, { data: reminder });
  } catch (error) {
    return sendError(res, {
      status: 500,
      code: "REMINDER_DELETE_FAILED",
      message: "Could not soft delete reminder",
      details: error.message,
    });
  }
};

export const restoreReminder = async (req, res) => {
  try {
    const householdContext = await householdService.ensureUserHouseholdContext(req.user._id);
    const reminder = await Reminder.findOneAndUpdate(
      {
        _id: req.params.id,
        $or: [
          { householdId: householdContext?.household?._id || null },
          { ownerId: req.user._id, householdId: null },
        ],
      },
      { active: true, deletedAt: null },
      { new: true }
    );

    if (!reminder) {
      return sendError(res, {
        status: 404,
        code: "REMINDER_NOT_FOUND",
        message: "Reminder not found",
      });
    }

    return sendSuccess(res, { data: reminder });
  } catch (error) {
    return sendError(res, {
      status: 500,
      code: "REMINDER_RESTORE_FAILED",
      message: "Could not restore reminder",
      details: error.message,
    });
  }
};
