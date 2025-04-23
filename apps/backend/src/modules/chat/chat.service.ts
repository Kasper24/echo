import {
  and,
  count,
  desc,
  eq,
  getTableColumns,
  ne,
  notExists,
  sql,
} from "drizzle-orm";
import { db } from "@repo/database";
import {
  blockedUsers,
  type Chat,
  ChatParticipant,
  chatParticipants,
  chats,
  messageReadReceipts,
  messages,
  User,
  users,
} from "@repo/database/schema";
import { AuthError, NotFoundError } from "@repo/backend/errors";

type OtherUser = NonNullable<
  Awaited<ReturnType<typeof getDirectChatOtherParticipant>>
>;

const getDirectChatOtherParticipant = async (
  chatId: number,
  userId: number
) => {
  return (
    await db
      .select({
        id: chatParticipants.userId,
        displayName: users.displayName,
        profilePicture: users.profilePicture,
      })
      .from(chatParticipants)
      .innerJoin(users, eq(chatParticipants.userId, users.id))
      .where(
        and(
          eq(chatParticipants.chatId, chatId),
          ne(chatParticipants.userId, userId)
        )
      )
  )[0];
};

const enrichDirectChatWithUserInfo = async <T extends Chat>(
  chat: T,
  otherUser: OtherUser
) => {
  chat.name = otherUser.displayName;
  chat.picture = otherUser.profilePicture!;

  return chat;
};

const enrichDirectChatWithBlockingInfo = async <T extends Chat>(
  chat: T,
  userId: number,
  otherUser: OtherUser
) => {
  const isBlocked = await db.query.blockedUsers
    .findFirst({
      where: and(
        eq(blockedUsers.blockerId, userId),
        eq(blockedUsers.blockedId, otherUser.id)
      ),
    })
    .then((block) => !!block);

  return {
    ...chat,
    isBlocked,
  };
};

const enrichDirectChat = async <T extends Chat>(chat: T, userId: number) => {
  if (chat.type === "direct") {
    const otherUser = await getDirectChatOtherParticipant(chat.id, userId);
    if (!otherUser) return chat;
    chat = await enrichDirectChatWithUserInfo(chat, otherUser);
    chat = await enrichDirectChatWithBlockingInfo(chat, userId, otherUser);
  }
  return chat;
};

const anonymizeBlockedUserData = (user: User) => {
  return {
    id: user.id,
    phoneNumber: "Hidden",
    displayName: "User Unavailable",
    profilePicture: null,
    about: null,
    status: false,
    lastSeen: user.lastSeen,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
};

const getUserBlockers = async (userId: number) => {
  const blockedRelationships = await db.query.blockedUsers.findMany({
    where: eq(blockedUsers.blockedId, userId),
  });

  return new Set(blockedRelationships.map((rel) => rel.blockerId));
};

const getChats = async (userId: number) => {
  const result = await db
    .select({
      chatParticipants: {
        userId: chatParticipants.userId,
        role: chatParticipants.role,
        isBlocked: sql`(
        SELECT EXISTS (
          SELECT 1
          FROM ${blockedUsers}
          WHERE ${blockedUsers.blockerId} = ${userId}
          AND ${blockedUsers.blockedId} = ${chatParticipants.userId}
        )
      )`.as("isBlocked"),
      },
      id: chats.id,
      type: chats.type,
      createdAt: chats.createdAt,
      displayName: sql`CASE
      WHEN ${chats.type} = 'group' THEN ${chats.name}
      ELSE (
        SELECT ${users.displayName}
        FROM ${users}
        JOIN ${chatParticipants} ON ${users.id} = ${chatParticipants.userId}
        WHERE ${chatParticipants.chatId} = ${chats.id} AND ${users.id} != ${userId}
        LIMIT 1
      )
    END`.as("displayName"),
      displayPicture: sql`CASE
      WHEN ${chats.type} = 'group' THEN ${chats.picture}
      ELSE (
        SELECT ${users.profilePicture}
        FROM ${users}
        JOIN ${chatParticipants} ON ${users.id} = ${chatParticipants.userId}
        WHERE ${chatParticipants.chatId} = ${chats.id} AND ${users.id} != ${userId}
        LIMIT 1
      )
    END`.as("displayPicture"),
      lastMessage: sql`(
      SELECT ${messages.content}
      FROM ${messages}
      WHERE ${messages.chatId} = ${chats.id}
      ORDER BY ${messages.createdAt} DESC
      LIMIT 1
    )`.as("lastMessage"),
      lastMessageTime: sql`(
      SELECT ${messages.createdAt}
      FROM ${messages}
      WHERE ${messages.chatId} = ${chats.id}
      ORDER BY ${messages.createdAt} DESC
      LIMIT 1
    )`.as("lastMessageTime"),
      lastMessageSender: sql`(
        SELECT json_build_object(
          'userId', ${users.id},
          'displayName', ${users.displayName}
        )
        FROM ${messages}
        JOIN ${users} ON ${messages.senderId} = ${users.id}
        WHERE ${messages.chatId} = ${chats.id}
        ORDER BY ${messages.createdAt} DESC
        LIMIT 1
      )`.as("lastMessageSender"),
      unreadCount: sql`(
      SELECT COUNT(*)
      FROM ${messages}
      WHERE ${messages.chatId} = ${chats.id}
      AND NOT EXISTS (
        SELECT 1
        FROM ${messageReadReceipts}
        WHERE ${messageReadReceipts.chatId} = ${chats.id}
        AND ${messageReadReceipts.userId} = ${userId}
      )
    )`.as("unreadCount"),
      isBlocked: sql`(
      SELECT EXISTS (
        SELECT 1
        FROM ${blockedUsers}
        WHERE ${blockedUsers.blockerId} = ${userId}
        AND ${blockedUsers.blockedId} = ${chatParticipants.userId}
      )
    )`.as("isBlocked"),
    })
    .from(chats)
    .innerJoin(chatParticipants, eq(chats.id, chatParticipants.chatId))
    .where(eq(chatParticipants.userId, userId));
  // .orderBy(desc(sql`lastMessageTime`));

  return result;

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

  return await Promise.all(
    userChats.map(async (chat) => {
      chat = await enrichDirectChat(chat, userId);

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
          sender: anonymizeBlockedUserData(latestMessage.sender),
        };
      }

      const unreadMessagesCount = (
        await db
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
          )
      )[0].count;

      return {
        ...chat,
        latestMessage: processedLatestMessage,
        unreadMessagesCount,
      };
    })
  );
};

const getChatDetails = async (userId: number, chatId: number) => {
  const isParticipant = await db.query.chatParticipants.findFirst({
    where: and(
      eq(chatParticipants.userId, userId),
      eq(chatParticipants.chatId, chatId)
    ),
  });
  if (!isParticipant)
    throw new AuthError("You are not a participant of this chat");

  let chat = await db.query.chats.findFirst({
    where: eq(chats.id, chatId),
    with: {
      chatParticipants: {
        with: {
          user: true,
        },
      },
    },
  });
  if (!chat) throw new NotFoundError("Chat not found.");

  const blockerIds = await getUserBlockers(userId);

  chat.chatParticipants = chat.chatParticipants.map((participant) => {
    if (blockerIds.has(participant.user.id)) {
      return {
        ...participant,
        user: anonymizeBlockedUserData(participant.user),
      };
    }
    return participant;
  });

  chat = await enrichDirectChat(chat, userId);

  return chat;
};

const getChatMessages = async (
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
  });
  if (!chat) throw new NotFoundError("Chat not found.");

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
        sender: anonymizeBlockedUserData(message.sender),
      };
    }
    return message;
  });

  return {
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
  };
};

export { getChats, getChatDetails, getChatMessages };
