import { z } from "zod";
import { objectIdSchema } from "./commonSchemas.js";

export const remedyGenerateSchema = z.object({
  query: z.string().trim().min(1).max(240),
  memberId: z.union([objectIdSchema, z.literal("family")]).optional(),
});

