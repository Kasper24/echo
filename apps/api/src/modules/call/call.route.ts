import { and, desc, eq, isNotNull } from "drizzle-orm";
import { formatDistanceStrict } from "date-fns";
import {
  createTypiRouter,
  createTypiRoute,
  createTypiRouteHandler,
} from "@repo/typiserver";
import { db } from "@repo/database";
import { callParticipants, calls, chats, users } from "@repo/database/schema";
import authMiddleware from "@repo/api/middlewares/auth";

const callRouter = createTypiRouter({
  "/": createTypiRoute({
    get: createTypiRouteHandler({
      middlewares: [authMiddleware],
      handler: async (ctx) => {
        const userId = ctx.data.userId;

        const userCalls = await db
          .select({
            call: calls,
            chat: chats,
            self: callParticipants,
          })
          .from(calls)
          .innerJoin(callParticipants, eq(callParticipants.callId, calls.id))
          .innerJoin(chats, eq(calls.chatId, chats.id))
          .where(
            and(
              eq(callParticipants.userId, userId),
              isNotNull(callParticipants.joinedAt),
              isNotNull(callParticipants.leftAt)
            )
          )
          .orderBy(desc(callParticipants.joinedAt));

        const result = await Promise.all(
          userCalls.map(async (call) => {
            const participants = await db
              .select({
                user: users,
                callParticipant: callParticipants,
              })
              .from(callParticipants)
              .innerJoin(users, eq(callParticipants.userId, users.id))
              .where(eq(callParticipants.callId, call.call.id));

            const duration = formatDistanceStrict(
              call.self.leftAt || new Date(),
              call.self.joinedAt || new Date()
            );

            const isCaller = call.call.createdBy === userId;
            const status = isCaller
              ? participants.some(
                  (p) =>
                    p.user.id !== userId &&
                    p.callParticipant.status === "answered"
                )
                ? "answered"
                : "missed"
              : participants.find((p) => p.user.id === userId)?.callParticipant
                  .status || "missed";

            const participantsWithoutSelf = participants.filter(
              (participant) => participant.user.id !== userId
            );

            return {
              call: {
                ...call.call,
                status,
                duration: duration,
              },
              chat: call.chat,
              participants: participantsWithoutSelf,
              self: call.self,
            };
          })
        );

        return ctx.success({
          calls: result,
        });
      },
    }),
  }),
});

export default callRouter;
