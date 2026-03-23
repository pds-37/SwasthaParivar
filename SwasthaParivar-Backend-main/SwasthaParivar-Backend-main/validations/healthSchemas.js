import { z } from "zod";
import { objectIdSchema, paginationSchema } from "./commonSchemas.js";

export const healthParamsSchema = z.object({
  memberId: objectIdSchema,
});

export const healthListQuerySchema = paginationSchema;

export const healthRecordSchema = z.object({
  date: z.string().min(1, "Date is required"),
  bloodPressure: z.union([z.string(), z.number()]).optional(),
  heartRate: z.coerce.number().positive().optional(),
  bloodSugar: z.coerce.number().positive().optional(),
  weight: z.coerce.number().positive().optional(),
  sleep: z.coerce.number().positive().optional(),
  steps: z.coerce.number().nonnegative().optional(),
});

