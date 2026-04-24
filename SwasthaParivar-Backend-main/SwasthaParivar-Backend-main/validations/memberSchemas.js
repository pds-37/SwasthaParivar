import { z } from "zod";
import { objectIdSchema, paginationSchema, stringListSchema } from "./commonSchemas.js";

const MAX_MEMBER_AVATAR_LENGTH = 700000;

export const memberParamsSchema = z.object({
  id: objectIdSchema,
});

export const memberListQuerySchema = paginationSchema;

export const createMemberSchema = z.object({
  name: z.string().trim().min(2).max(80),
  relation: z.string().trim().min(1).max(40).optional().default(""),
  age: z.coerce.number().int().min(0).max(120),
  gender: z.enum(["male", "female", "other"]).default("other"),
  avatar: z.string().trim().max(MAX_MEMBER_AVATAR_LENGTH).optional(),
  conditions: stringListSchema.optional(),
  allergies: stringListSchema.optional(),
  medications: stringListSchema.optional(),
  childSensitive: z.coerce.boolean().optional(),
});

export const updateMemberProfileSchema = createMemberSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  "Provide at least one profile field to update"
);

export const updateMemberHealthSchema = z.object({
  health: z.record(z.string(), z.array(z.object({
    value: z.union([z.string(), z.number()]),
    date: z.string(),
  }))),
});
