import { z } from "zod";
import { and, eq } from "drizzle-orm";
import {
  createTypiRoute,
  createTypiRouteHandler,
  createTypiRouter,
} from "@repo/typiserver";
import { db } from "@repo/database";
import {
  refreshTokens,
  userPrivacySettings,
  users,
} from "@repo/database/schema";
import authMiddleware from "@repo/api/middlewares/auth";
import { createUpdateSchema } from "drizzle-zod";

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
          user: z.object({
            name: z.string().optional(),
            description: z.string().optional(),
            picture: z.instanceof(File).optional(),
          }),
        }),
      },
      middlewares: [authMiddleware],
      handler: async (ctx) => {
        const user = await db
          .update(users)
          .set({
            name: ctx.input.body.user.name,
            description: ctx.input.body.user.description,
            updatedAt: new Date(),
          })
          .where(eq(users.id, ctx.data.userId))
          .returning();

        if (!user.length) return ctx.error("NOT_FOUND", "User not found.");

        return ctx.success({
          user: user[0],
        });
      },
    }),
    delete: createTypiRouteHandler({
      middlewares: [authMiddleware],
      handler: async (ctx) => {
        const deleted = await db
          .delete(users)
          .where(eq(users.id, ctx.data.userId))
          .returning();

        if (!deleted.length) return ctx.error("NOT_FOUND", "User not found.");

        await db
          .delete(refreshTokens)
          .where(eq(refreshTokens.userId, ctx.data.userId));

        ctx.response.clearCookie(process.env.JWT_ACCESS_TOKEN_COOKIE_KEY);
        ctx.response.clearCookie(process.env.JWT_REFRESH_TOKEN_COOKIE_KEY);

        return ctx.success({
          message: "User deleted successfully.",
        });
      },
    }),
  }),
  "/privacy": createTypiRoute({
    get: createTypiRouteHandler({
      middlewares: [authMiddleware],
      handler: async (ctx) => {
        const privacySettings = await db.query.userPrivacySettings.findFirst({
          where: and(eq(users.id, ctx.data.userId)),
        });
        if (!privacySettings) return ctx.error("NOT_FOUND", "User not found.");

        return ctx.success({
          privacySettings,
        });
      },
    }),
    patch: createTypiRouteHandler({
      input: {
        body: z.object({
          privacySettings: createUpdateSchema(userPrivacySettings, {
            createdAt: z.undefined(),
            updatedAt: z.undefined(),
          }),
        }),
      },
      middlewares: [authMiddleware],
      handler: async (ctx) => {
        const updatedPrivacySettings = await db
          .update(userPrivacySettings)
          .set({
            updatedAt: new Date(),
            ...ctx.input.body.privacySettings,
          })
          .where(eq(userPrivacySettings.userId, ctx.data.userId))
          .returning();

        if (!updatedPrivacySettings.length)
          return ctx.error("NOT_FOUND", "User not found.");

        return ctx.success({
          privacySettings: updatedPrivacySettings[0],
        });
      },
    }),
  }),
});

export default userRouter;
