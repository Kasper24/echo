import { relations } from "drizzle-orm";
import { userPrivacySettings, users } from "./users";
import { chatParticipants, chats } from "./chats";
import { blockedUsers, friends } from "./friendships";
import { messageReadReceipts, messages } from "./messages";

export const usersRealtions = relations(users, ({ one, many }) => ({
  userPrivacySettings: one(userPrivacySettings),
  chats: many(chats),
  friends: many(friends),
  blockedUsers: many(blockedUsers),
  sentMessages: many(messages, { relationName: "sender" }),
  receivedMessages: many(messages, { relationName: "receiver" }),
  chatParticipants: many(chatParticipants),
}));

export const userPrivacySettingsRelations = relations(
  userPrivacySettings,
  ({ one, many }) => ({
    user: one(users, {
      fields: [userPrivacySettings.userId],
      references: [users.id],
    }),
  })
);

export const friendsRealtions = relations(friends, ({ one, many }) => ({
  userA: one(users, {
    fields: [friends.userA],
    references: [users.id],
    relationName: "userA",
  }),
  userB: one(users, {
    fields: [friends.userB],
    references: [users.id],
    relationName: "userB",
  }),
}));

export const blockedUsersRelations = relations(
  blockedUsers,
  ({ one, many }) => ({
    blocker: one(users, {
      fields: [blockedUsers.blockerId],
      references: [users.id],
      relationName: "blocker",
    }),
    blocked: one(users, {
      fields: [blockedUsers.blockedId],
      references: [users.id],
      relationName: "blocked",
    }),
  })
);

export const chatsRelations = relations(chats, ({ one, many }) => ({
  chatParticipants: many(chatParticipants),
  messages: many(messages),
}));

export const chatParticipantsRelations = relations(
  chatParticipants,
  ({ one, many }) => ({
    user: one(users, {
      fields: [chatParticipants.userId],
      references: [users.id],
    }),
    chat: one(chats, {
      fields: [chatParticipants.chatId],
      references: [chats.id],
    }),
  })
);

export const messagesRelations = relations(messages, ({ one, many }) => ({
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
    relationName: "sender",
  }),
  chat: one(chats, {
    fields: [messages.chatId],
    references: [chats.id],
  }),
}));

export const messageReadReceiptsRelations = relations(
  messageReadReceipts,
  ({ one, many }) => ({
    chat: one(chats, {
      fields: [messageReadReceipts.chatId],
      references: [chats.id],
    }),
    message: one(messages, {
      fields: [messageReadReceipts.messageId],
      references: [messages.id],
    }),
    user: one(users, {
      fields: [messageReadReceipts.userId],
      references: [users.id],
    }),
  })
);
