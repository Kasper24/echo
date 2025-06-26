import { and, eq } from "drizzle-orm";
import {
  createTypiRouter,
  createTypiRoute,
  createTypiRouteHandler,
} from "@repo/typiserver";
import { db } from "@repo/database";
import { blockedUsers, friends } from "@repo/database/schema";
import authMiddleware from "@repo/api/middlewares/auth";

const blockRouter = createTypiRouter({
  "/all": createTypiRoute({
    get: createTypiRouteHandler({
      middlewares: [authMiddleware],
      handler: async (ctx) => {
        const blockedUsersList = await db.query.blockedUsers.findMany({
          where: eq(blockedUsers.blockerId, ctx.data.userId),
          with: {
            blocked: true,
          },
        });

        return ctx.success({
          blockedUsers: blockedUsersList,
        });
      },
    }),
  }),
  "/:userId": createTypiRoute({
    post: createTypiRouteHandler("/:userId", {
      middlewares: [authMiddleware],
      handler: async (ctx) => {
        const blockedUserId = parseInt(ctx.input.path.userId);

        if (ctx.data.userId === blockedUserId)
          return ctx.error("BAD_REQUEST", "You can't block yourself.");

        const blockedUser = await db.query.blockedUsers.findFirst({
          where: and(
            eq(blockedUsers.blockerId, ctx.data.userId),
            eq(blockedUsers.blockedId, blockedUserId),
          ),
        });

        if (blockedUser)
          return ctx.error("BAD_REQUEST", "You already blocked this user.");

        await db.insert(blockedUsers).values({
          blockerId: ctx.data.userId,
          blockedId: blockedUserId,
        });

        return ctx.success({
          message: "User blocked successfully",
        });
      },
    }),
    delete: createTypiRouteHandler("/:userId", {
      middlewares: [authMiddleware],
      handler: async (ctx) => {
        const unblockedUserId = parseInt(ctx.input.path.userId);

        if (ctx.data.userId === unblockedUserId)
          return ctx.error("BAD_REQUEST", "You can't unblock yourself.");

        const result = await db
          .delete(blockedUsers)
          .where(
            and(
              eq(blockedUsers.blockerId, ctx.data.userId),
              eq(blockedUsers.blockedId, unblockedUserId),
            ),
          )
          .returning();

        if (result.length === 0)
          return ctx.error(
            "BAD_REQUEST",
            "User not found or already unblocked.",
          );

        return ctx.success({
          message: "User unblocked successfully",
        });
      },
    }),
  }),
});

export default blockRouter;
