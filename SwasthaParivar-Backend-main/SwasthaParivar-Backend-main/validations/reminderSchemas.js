import { z } from "zod";
import { objectIdSchema, paginationSchema } from "./commonSchemas.js";

const frequencySchema = z.enum(["once", "daily", "weekly", "monthly", "yearly"]);
const categorySchema = z.enum([
  "medicine",
  "vaccination",
  "checkup",
  "custom",
  "followup",
  "adverse_check",
  "doctor_handoff",
]);

export const reminderParamsSchema = z.object({
  id: objectIdSchema,
});

export const reminderListQuerySchema = paginationSchema;

export const reminderBodySchema = z.object({
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).optional().default(""),
  category: categorySchema,
  memberId: objectIdSchema.optional().nullable(),
  frequency: frequencySchema.default("once"),
  options: z
    .object({
      weekday: z.coerce.number().int().min(0).max(6).optional(),
      dayOfMonth: z.coerce.number().int().min(1).max(31).optional(),
      time: z.string().regex(/^\d{2}:\d{2}$/, "Time must be HH:MM").optional(),
    })
    .optional()
    .default({}),
  nextRunAt: z.string().datetime("Invalid datetime"),
  meta: z.record(z.string(), z.any()).optional().default({}),
});

export const updateReminderSchema = reminderBodySchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  "Provide at least one field to update"
);

