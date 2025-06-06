import { z } from "zod";
import { and, count, desc, eq, ne, notExists } from "drizzle-orm";
import {
  createTypiRouter,
  createTypiRoute,
  createTypiRouteHandler,
} from "@repo/typiserver";
import { db } from "@repo/database";
import {
  blockedUsers,
  type Chat,
  chatParticipants,
  chats,
  messageReadReceipts,
  messages,
  users,
} from "@repo/database/schema";
import authMiddleware from "@repo/backend/middlewares/auth";

const enrichDirectChat = async <T extends Chat>(chat: T, userId: number) => {
  if (chat.type === "direct") {
    const otherUser =
      (
        await db
          .select({
            id: users.id,
            phoneNumber: users.phoneNumber,
            name: users.name,
            description: users.description,
            picture: users.picture,
            status: users.status,
            lastSeen: users.lastSeen,
          })
          .from(chatParticipants)
          .innerJoin(users, eq(chatParticipants.userId, users.id))
          .where(
            and(
              eq(chatParticipants.chatId, chat.id),
              ne(chatParticipants.userId, userId)
            )
          )
      )[0] || unavailableUserData();

    const isBlocked =
      (await db.query.blockedUsers.findFirst({
        where: and(
          eq(blockedUsers.blockerId, userId),
          eq(blockedUsers.blockedId, otherUser.id)
        ),
      })) !== undefined;

    return {
      ...chat,
      type: "direct" as const,
      name: otherUser.name,
      picture: otherUser.picture,
      description: otherUser.description,
      otherUser: {
        ...otherUser,
        isBlocked: isBlocked,
      },
    };
  }

  return {
    ...chat,
    type: "group" as const,
    otherUser: undefined,
  };
};

const unavailableUserData = () => {
  return {
    id: -1,
    phoneNumber: "Hidden",
    name: "User Unavailable",
    picture: null,
    description: "User description is unavailable",
    status: false,
    lastSeen: new Date(0),
    createdAt: new Date(0),
    updatedAt: new Date(0),
    isBlocked: false,
  };
};

const getUserBlockers = async (userId: number) => {
  const blockedRelationships = await db.query.blockedUsers.findMany({
    where: eq(blockedUsers.blockedId, userId),
  });

  return new Set(blockedRelationships.map((rel) => rel.blockerId));
};

const chatRouter = createTypiRouter({
  "/": createTypiRoute({
    get: createTypiRouteHandler({
      middlewares: [authMiddleware],
      handler: async (ctx) => {
        const userId = ctx.data.userId;

        const userChats = await db
          .select({
            id: chats.id,
            type: chats.type,
            name: chats.name,
            description: chats.description,
            picture: chats.picture,
            createdAt: chats.createdAt,
            updatedAt: chats.updatedAt,
          })
          .from(chats)
          .innerJoin(chatParticipants, eq(chatParticipants.chatId, chats.id))
          .where(eq(chatParticipants.userId, userId));

        const blockerIds = await getUserBlockers(userId);

        const result = await Promise.all(
          userChats.map(async (chat) => {
            const latestMessage = await db.query.messages.findFirst({
              where: eq(messages.chatId, chat.id),
              orderBy: [desc(messages.createdAt)],
              with: {
                sender: true,
              },
            });

            let processedLatestMessage = latestMessage;
            if (latestMessage && blockerIds.has(latestMessage.sender.id)) {
              processedLatestMessage = {
                ...latestMessage,
                sender: unavailableUserData(),
              };
            }

            const unreadMessagesCount = (
              await db
                .select({ count: count() })
                .from(messages)
                .where(
                  and(
                    eq(messages.chatId, chat.id),
                    ne(messages.senderId, userId),
                    notExists(
                      db
                        .select()
                        .from(messageReadReceipts)
                        .where(
                          and(
                            eq(messageReadReceipts.messageId, messages.id), // Add this line to match specific message
                            eq(messageReadReceipts.userId, userId)
                          )
                        )
                    )
                  )
                )
            )[0].count;

            const enrcihedDirectChat = await enrichDirectChat(chat, userId);

            return {
              ...enrcihedDirectChat,
              latestMessage: processedLatestMessage,
              unreadMessagesCount,
            };
          })
        );

        return ctx.success({
          chats: result,
        });
      },
    }),
  }),
  "/:chatId": createTypiRoute({
    get: createTypiRouteHandler("/:chatId", {
      middlewares: [authMiddleware],
      handler: async (ctx) => {
        const chatId = parseInt(ctx.input.path.chatId);
        const userId = ctx.data.userId;

        const isParticipant = await db.query.chatParticipants.findFirst({
          where: and(
            eq(chatParticipants.userId, userId),
            eq(chatParticipants.chatId, chatId)
          ),
        });
        if (!isParticipant)
          return ctx.error(
            "UNAUTHORIZED",
            "You are not a participant of this chat"
          );

        const chat = await db.query.chats.findFirst({
          where: eq(chats.id, chatId),
          with: {
            chatParticipants: {
              with: {
                user: true,
              },
            },
          },
        });
        if (!chat) return ctx.error("NOT_FOUND", "Chat not found.");

        const blockerIds = await getUserBlockers(userId);

        chat.chatParticipants = chat.chatParticipants.map((participant) => {
          if (blockerIds.has(participant.user.id)) {
            return {
              ...participant,
              user: unavailableUserData(),
            };
          }
          return participant;
        });

        const enrichedDirectChat = await enrichDirectChat(chat, userId);

        return ctx.success(enrichedDirectChat);
      },
    }),
  }),
  "/:chatId/messages": createTypiRoute({
    get: createTypiRouteHandler("/:chatId/messages", {
      input: {
        query: z.object({
          page: z.coerce.number().positive().int().default(1),
          limit: z.coerce.number().positive().int().default(50),
        }),
      },
      middlewares: [authMiddleware],
      handler: async (ctx) => {
        const chatId = parseInt(ctx.input.path.chatId);
        const userId = ctx.data.userId;
        const page = ctx.input.query.page;
        const limit = ctx.input.query.limit;

        const isParticipant = await db.query.chatParticipants.findFirst({
          where: and(
            eq(chatParticipants.userId, userId),
            eq(chatParticipants.chatId, chatId)
          ),
        });
        if (!isParticipant)
          return ctx.error(
            "UNAUTHORIZED",
            "You are not a participant of this chat"
          );

        const chat = await db.query.chats.findFirst({
          where: eq(chats.id, chatId),
        });
        if (!chat) return ctx.error("NOT_FOUND", "Chat not found.");

        const totalMessages = await db.query.messages.findMany({
          where: eq(messages.chatId, chatId),
        });

        const totalPages = Math.ceil(totalMessages.length / limit);
        const messagesOffset = (page - 1) * limit;
        const hasPrev = page > 1;
        const hasNext = page < totalPages;
        const prevPage = hasPrev ? page - 1 : null;
        const nextPage = hasNext ? page + 1 : null;

        const chatMessages = await db.query.messages.findMany({
          where: eq(messages.chatId, chatId),
          limit: limit,
          offset: messagesOffset,
          orderBy: [desc(messages.createdAt)],
          with: {
            sender: true,
            readReceipnts: true,
            attachments: true,
          },
        });

        const blockerIds = await getUserBlockers(userId);

        const processedMessages = chatMessages.map((message) => {
          if (blockerIds.has(message.senderId)) {
            return {
              ...message,
              sender: unavailableUserData(),
            };
          }
          return message;
        });

        return ctx.success({
          data: processedMessages,
          pagination: {
            page,
            limit,
            totalPages,
            prevPage,
            nextPage,
            hasNext,
            hasPrev,
          },
        });
      },
    }),
  }),
});

export default chatRouter;
