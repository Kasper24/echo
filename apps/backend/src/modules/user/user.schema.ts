import { z } from "zod";
import { createUpdateSchema } from "drizzle-zod";
import { users } from "@repo/database/schema";

const updateUserSchema = z.object({
  body: z.object({
    updatedUser: createUpdateSchema(users).partial(),
  }),
});

export { updateUserSchema };
