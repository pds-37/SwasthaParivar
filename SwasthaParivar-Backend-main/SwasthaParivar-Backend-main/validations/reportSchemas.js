import { z } from "zod";
import { objectIdSchema, paginationSchema } from "./commonSchemas.js";

export const reportListQuerySchema = paginationSchema.extend({
  memberId: objectIdSchema.optional(),
  reportType: z.string().trim().max(80).optional(),
});

export const reportUploadBodySchema = z.object({
  memberId: objectIdSchema,
  reportType: z.string().trim().min(2).max(80),
  notes: z.string().trim().max(500).optional().default(""),
  aiSummary: z.string().trim().max(2000).optional().default(""),
});

export const reportParamsSchema = z.object({
  id: objectIdSchema,
});

export const reportDownloadQuerySchema = z.object({
  token: z.string().min(20),
  expiresAt: z.string().min(1),
});
