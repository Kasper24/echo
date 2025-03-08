import { and, count, desc, eq, exists, notExists } from "drizzle-orm";
import { db } from "@repo/database";
import {
  chatParticipants,
  chats,
  messageReadReceipts,
  messages,
  users,
} from "@repo/database/schema";
import { AuthError } from "@repo/backend/utils/errors";

const getChats = async (userId: number) => {
  const userChats = await db
    .select()
    .from(chats)
    .where(
      exists(
        db
          .select()
          .from(chatParticipants)
          .where(eq(chatParticipants.userId, users.id))
      )
    );

  return await Promise.all(
    userChats.map(async (chat) => {
      const latestMessage = await db.query.messages.findFirst({
        where: eq(messages.chatId, chat.id),
        orderBy: [desc(messages.sentAt)],
        with: {
          sender: {
            columns: {
              id: false,
            },
          },
        },
      });

      const unreadMessagesCount = await db
        .select({ count: count() })
        .from(messages)
        .where(
          notExists(
            db
              .select()
              .from(messageReadReceipts)
              .where(
                and(
                  eq(messageReadReceipts.chatId, chat.id),
                  eq(messageReadReceipts.userId, userId)
                )
              )
          )
        );

      return {
        ...chat,
        latestMessage,
        unreadMessagesCount,
      };
    })
  );
};

const getChatDetails = async (
  userId: number,
  chatId: number,
  page: number,
  limit: number
) => {
  const isParticipant = await db.query.chatParticipants.findFirst({
    where: and(
      eq(chatParticipants.userId, userId),
      eq(chatParticipants.chatId, chatId)
    ),
  });
  if (!isParticipant)
    throw new AuthError("You are not a participant of this chat");

  const chat = await db.query.chats.findFirst({
    where: eq(chats.id, chatId),
    with: {
      chatParticipants: {
        with: {
          user: {
            columns: {
              id: false,
            },
          },
        },
      },
    },
  });

  const messagesOffset = (page - 1) * limit;

  const chatMessages = await db.query.messages.findMany({
    where: eq(messages.chatId, chatId),
    limit: limit,
    offset: messagesOffset,
    with: {
      sender: {
        columns: {
          id: false,
        },
      },
    },
  });

  return {
    ...chat,
    messages: chatMessages,
    pagination: {
      page,
      limit,
      hasMore: chatMessages.length === limit,
    },
  };
};

export { getChats, getChatDetails };
