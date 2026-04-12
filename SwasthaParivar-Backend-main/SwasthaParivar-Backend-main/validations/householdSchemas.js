import { z } from "zod";

export const createInviteSchema = z.object({
  inviteType: z.enum(["adult_invite", "link_existing"]),
  email: z.string().trim().email(),
  name: z.string().trim().max(120).optional().default(""),
  relation: z.string().trim().max(40).optional().default(""),
});

export const acceptInviteSchema = z.object({
  code: z.string().trim().min(4).max(20),
});
