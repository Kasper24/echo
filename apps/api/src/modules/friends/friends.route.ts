import { and, eq, not, or } from "drizzle-orm";
import {
  createTypiRoute,
  createTypiRouteHandler,
  createTypiRouter,
} from "@repo/typiserver";
import { db } from "@repo/database";
import { friends, users } from "@repo/database/schema";
import authMiddleware from "@repo/api/middlewares/auth";

const friendsRouter = createTypiRouter({
  "/": createTypiRoute({
    get: createTypiRouteHandler({
      middlewares: [authMiddleware],
      handler: async (ctx) => {
        const userId = ctx.data.userId;

        const acceptedFriends = await db
          .select({
            id: users.id,
            phoneNumber: users.phoneNumber,
            name: users.name,
            picture: users.picture,
            description: users.description,
            status: users.status,
          })
          .from(friends)
          .innerJoin(
            users,
            and(
              eq(friends.status, "accepted"),
              or(eq(friends.userA, userId), eq(friends.userB, userId)),
            ),
          )
          .where(
            and(
              not(eq(users.id, userId)), // Exclude self from results
            ),
          );

        const friendsRequestsSent = await db
          .select({
            id: users.id,
            phoneNumber: users.phoneNumber,
            name: users.name,
            picture: users.picture,
            description: users.description,
            status: users.status,
          })
          .from(friends)
          .where(and(eq(friends.userA, userId), eq(friends.status, "pending")))
          .innerJoin(users, eq(friends.userB, users.id));

        const friendsRequestsReceived = await db
          .select({
            id: users.id,
            phoneNumber: users.phoneNumber,
            name: users.name,
            picture: users.picture,
            description: users.description,
            status: users.status,
          })
          .from(friends)
          .where(and(eq(friends.userB, userId), eq(friends.status, "pending")))
          .innerJoin(users, eq(friends.userA, users.id));

        return ctx.success({
          acceptedFriends,
          friendsRequestsSent,
          friendsRequestsReceived,
        });
      },
    }),
  }),
  "/:friendId": createTypiRoute({
    post: createTypiRouteHandler("/:friendId", {
      middlewares: [authMiddleware],
      handler: async (ctx) => {
        const userId = ctx.data.userId;
        const friendId = parseInt(ctx.input.path.friendId);

        if (userId === friendId)
          return ctx.error(
            "BAD_REQUEST",
            "You can't send a friend request to yourself",
          );

        const friendship = await db.query.friends.findFirst({
          where: or(
            and(eq(friends.userA, userId), eq(friends.userB, friendId)),
            and(eq(friends.userB, userId), eq(friends.userA, friendId)),
          ),
          with: {
            userA: true,
            userB: true,
          },
        });

        if (friendship?.status === "accepted")
          return ctx.error(
            "BAD_REQUEST",
            "You already have a friendship with this user",
          );

        if (friendship?.status === "pending") {
          if (friendship.userB.id === userId)
            return ctx.error(
              "BAD_REQUEST",
              "Please accept or deny this friend request",
            );
          else if (friendship.userA.id === userId)
            return ctx.error("BAD_REQUEST", "Friend request already exists");
        }

        await db.insert(friends).values({
          status: "pending",
          userA: userId,
          userB: friendId,
        });

        return ctx.success({
          message: "Friend request sent successfully",
        });
      },
    }),
    delete: createTypiRouteHandler("/:friendId", {
      middlewares: [authMiddleware],
      handler: async (ctx) => {
        const userId = ctx.data.userId;
        const friendId = parseInt(ctx.input.path.friendId);

        if (userId === friendId)
          return ctx.error(
            "BAD_REQUEST",
            "You can't delete yourself from friends",
          );

        const friendship = await db.query.friends.findFirst({
          where: or(
            and(eq(friends.userA, userId), eq(friends.userB, friendId)),
            and(eq(friends.userB, userId), eq(friends.userA, friendId)),
          ),
        });

        if (!friendship) return ctx.error("NOT_FOUND", "Friend not found.");

        if (friendship.status === "pending")
          return ctx.error(
            "BAD_REQUEST",
            "You can't delete a pending friend request",
          );

        const result = await db
          .delete(friends)
          .where(
            or(
              and(eq(friends.userA, userId), eq(friends.userB, friendId)),
              and(eq(friends.userB, userId), eq(friends.userA, friendId)),
            ),
          )
          .returning();

        if (result.length === 0)
          return ctx.error("NOT_FOUND", "Friend not found or already deleted.");

        return ctx.success({
          message: "Friend deleted successfully",
        });
      },
    }),
  }),
  "/:friendId/accept": createTypiRoute({
    post: createTypiRouteHandler("/:friendId/accept", {
      middlewares: [authMiddleware],
      handler: async (ctx) => {
        const userId = ctx.data.userId;
        const friendId = parseInt(ctx.input.path.friendId);
        const result = await db
          .update(friends)
          .set({ status: "accepted" })
          .where(
            and(
              eq(friends.userA, userId),
              eq(friends.userB, friendId),
              eq(friends.status, "pending"),
            ),
          )
          .returning();

        if (result.length === 0)
          return ctx.error(
            "BAD_REQUEST",
            "Friend request not found or already accepted.",
          );

        return ctx.success({
          message: "Friend request accepted successfully",
        });
      },
    }),
  }),
  "/:friendId/deny": createTypiRoute({
    post: createTypiRouteHandler("/:friendId/deny", {
      middlewares: [authMiddleware],
      handler: async (ctx) => {
        const userId = ctx.data.userId;
        const friendId = parseInt(ctx.input.path.friendId);
        const result = await db
          .delete(friends)
          .where(
            and(
              eq(friends.userA, userId),
              eq(friends.userB, friendId),
              eq(friends.status, "pending"),
            ),
          )
          .returning();

        if (result.length === 0)
          return ctx.error(
            "BAD_REQUEST",
            "Friend request not found or already denied.",
          );

        return ctx.success({
          message: "Friend request denied successfully",
        });
      },
    }),
  }),
});

export default friendsRouter;
