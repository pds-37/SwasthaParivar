import { z } from "zod";
import { objectIdSchema, paginationSchema } from "./commonSchemas.js";

export const healthParamsSchema = z.object({
  memberId: objectIdSchema,
});

export const healthListQuerySchema = paginationSchema;

export const HEALTH_ENTRY_SOURCES = ["manual", "ble_device", "ble_simulated"];

export const healthRecordSchema = z.object({
  date: z.string().min(1, "Date is required"),
  bloodPressure: z.union([z.string(), z.number()]).optional(),
  heartRate: z.coerce.number().min(0).optional(),
  bloodSugar: z.coerce.number().min(0).optional(),
  spO2: z.coerce.number().min(0).max(100).optional(),
  weight: z.coerce.number().min(0).optional(),
  sleep: z.coerce.number().min(0).optional(),
  steps: z.coerce.number().min(0).optional(),
  source: z.enum(HEALTH_ENTRY_SOURCES).optional().default("manual"),
});

