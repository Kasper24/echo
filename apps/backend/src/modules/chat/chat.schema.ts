import { z } from "zod";

const getChatDetailsSchema = z.object({
  params: z.object({
    chatId: z.coerce.number().int(),
  }),
  query: z.object({
    page: z.coerce.number().positive().int().default(1),
    limit: z.coerce.number().positive().int().default(50),
  }),
});

export { getChatDetailsSchema };
