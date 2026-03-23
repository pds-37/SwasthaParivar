import { z } from "zod";
import { objectIdSchema, paginationSchema } from "./commonSchemas.js";

export const aiChatSchema = z.object({
  message: z.string().trim().min(1).max(4000),
  member: z.string().trim().max(120).optional(),
  history: z
    .array(
      z.object({
        sender: z.enum(["user", "ai"]),
        text: z.string().trim().max(2000),
        ts: z.number().optional(),
      })
    )
    .max(8)
    .optional(),
});

export const aiAttachmentSchema = z.object({
  imageData: z.string().min(20),
  mimeType: z.string().refine((value) => value.startsWith("image/") || value === "application/pdf", {
    message: "Only image and PDF uploads are supported",
  }),
  fileName: z.string().trim().max(255).optional(),
  member: z.string().trim().max(120).optional(),
});

export const aiMemoryQuerySchema = z.object({
  member: z.string().trim().max(120).optional(),
});

export const aiMemoryBodySchema = z.object({
  member: z.string().trim().min(1).max(120),
  messages: z.array(
    z.object({
      sender: z.enum(["user", "ai"]),
      text: z.string().trim().max(4000),
      ts: z.number().optional(),
      attachment: z.string().optional().nullable(),
    })
  ),
});

export const aiInsightQuerySchema = paginationSchema.extend({
  memberId: objectIdSchema.optional(),
});
