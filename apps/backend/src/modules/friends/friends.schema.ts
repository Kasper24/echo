import { z } from "zod";

const friendsSchema = z.object({
  params: z.object({
    friendId: z.coerce.number().int(),
  }),
});

export { friendsSchema };
