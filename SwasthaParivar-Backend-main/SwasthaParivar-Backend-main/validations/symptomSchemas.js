import { z } from "zod";
import { objectIdSchema, paginationSchema } from "./commonSchemas.js";

export const symptomEpisodeBodySchema = z.object({
  memberId: objectIdSchema,
  symptoms: z
    .array(
      z.object({
        name: z.string().trim().min(2).max(80),
        severity: z.coerce.number().int().min(1).max(5).optional(),
        notes: z.string().trim().max(240).optional(),
      })
    )
    .min(1),
  severity: z.enum(["mild", "moderate", "severe"]).default("mild"),
  sourceMessage: z.string().trim().max(2000).optional().default(""),
});

export const symptomEpisodeQuerySchema = paginationSchema.extend({
  memberId: objectIdSchema.optional(),
});
