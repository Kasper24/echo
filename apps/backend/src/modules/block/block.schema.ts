import { z } from "zod";

const blockSchema = z.object({
  params: z.object({
    userId: z.coerce.number().int(),
  }),
});

export { blockSchema };
