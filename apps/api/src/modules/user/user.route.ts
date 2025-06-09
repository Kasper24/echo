import { z } from "zod";
import { and, eq } from "drizzle-orm";
import {
  createTypiRoute,
  createTypiRouteHandler,
  createTypiRouter,
} from "@repo/typiserver";
import { db } from "@repo/database";
import { users } from "@repo/database/schema";
import authMiddleware from "@repo/api/middlewares/auth";

const userRouter = createTypiRouter({
  "/": createTypiRoute({
    get: createTypiRouteHandler({
      middlewares: [authMiddleware],
      handler: async (ctx) => {
        const me = await db.query.users.findFirst({
          where: and(eq(users.id, ctx.data.userId)),
        });
        if (!me) return ctx.error("NOT_FOUND", "User not found.");

        return ctx.success({
          user: me,
        });
      },
    }),
    patch: createTypiRouteHandler({
      input: {
        body: z.object({
          name: z.string().optional(),
          description: z.string().optional(),
          picture: z.string().optional(),
        }),
      },
      middlewares: [authMiddleware],
      handler: async (ctx) => {
        const user = await db
          .update(users)
          .set({
            updatedAt: new Date(),
            ...ctx.input.body,
          })
          .where(eq(users.id, ctx.data.userId))
          .returning();

        if (!user.length) return ctx.error("NOT_FOUND", "User not found.");

        return ctx.success({
          user: user[0],
        });
      },
    }),
  }),
});

export default userRouter;
