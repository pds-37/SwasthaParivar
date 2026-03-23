import { z } from "zod";

export const notificationSubscriptionSchema = z.object({
  subscription: z.object({
    endpoint: z.string().url(),
    keys: z.object({
      auth: z.string().min(1),
      p256dh: z.string().min(1),
    }),
  }),
});

