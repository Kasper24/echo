import { relations } from "drizzle-orm";
import {
  pgTable,
  pgEnum,
  integer,
  varchar,
  text,
  timestamp,
  boolean,
  uuid,
  primaryKey,
} from "drizzle-orm/pg-core";

const friendStatusEnum = pgEnum("friend_status", [
  "pending",
  "accepted",
  "denied",
]);
export const chatTypeEnum = pgEnum("chat_type", ["direct", "group"]);
export const userRoleEnum = pgEnum("user_role", ["admin", "user"]);
export const messageStatusEnum = pgEnum("message_status", [
  "sent",
  "delivered",
  "read",
]);

const base = pgTable("base", {
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),
});

export const users = pgTable("users", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  phoneNumber: varchar({ length: 15 }).notNull(),
  displayName: varchar({ length: 255 }).notNull(),
  profilePicture: text(),
  about: text().default("Hello, I'm a new user!"),
  status: boolean().notNull().default(false),
  lastSeen: timestamp().notNull().defaultNow(),
  createdAt: timestamp().notNull().defaultNow(),
});

export const userPrivacySettings = pgTable("user_privacy_settings", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: integer()
    .notNull()
    .unique()
    .references(() => users.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),
  showOnlineStatus: boolean().notNull().default(true),
  showLastSeen: boolean().notNull().default(true),
  showReadReceipts: boolean().notNull().default(true),
});

export const otps = pgTable("otps", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  phoneNumber: varchar({ length: 15 }).notNull(),
  otp: varchar({ length: 6 }).notNull(),
  expiresAt: timestamp().notNull(),
});

export const refreshTokens = pgTable("refresh_tokens", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: integer()
    .notNull()
    .references(() => users.id, { onDelete: "cascade", onUpdate: "cascade" }),
  token: text().notNull().unique(),
});

export const friends = pgTable(
  "friends",
  {
    userA: integer()
      .notNull()
      .references(() => users.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    userB: integer()
      .notNull()
      .references(() => users.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    status: friendStatusEnum().notNull().default("pending"),
  },
  (table) => [primaryKey({ columns: [table.userA, table.userB] })]
);

export const blockedUsers = pgTable("blocked_users", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  blockerId: integer()
    .notNull()
    .references(() => users.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),
  blockedId: integer()
    .notNull()
    .references(() => users.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),
  createdAt: timestamp().notNull().defaultNow(),
});

export const chats = pgTable("chats", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  type: chatTypeEnum().notNull().default("direct"),
  name: text().unique().notNull(),
  description: text().notNull(),
  picture: text().notNull(),
  createdAt: timestamp().defaultNow().notNull(),
  updatedAt: timestamp().defaultNow().notNull(),
});

export const chatParticipants = pgTable("chat_participants", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: integer()
    .references(() => users.id)
    .notNull(),
  chatId: integer()
    .references(() => chats.id)
    .notNull(),
  role: userRoleEnum().notNull().default("user"),
  joinedAt: timestamp().notNull().defaultNow(),
});

export const messages = pgTable("messages", {
  id: uuid().defaultRandom(),
  chatId: integer()
    .notNull()
    .references(() => chats.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),
  senderId: integer()
    .notNull()
    .references(() => users.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),
  content: text().notNull(),
  sentAt: timestamp().notNull().defaultNow(),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().defaultNow(),
});

export const messageReadReceipts = pgTable("message_read_receipts", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  chatId: integer()
    .references(() => chats.id)
    .notNull(),
  messageId: integer()
    .references(() => messages.id)
    .notNull(),
  userId: integer()
    .references(() => users.id)
    .notNull(),
  readAt: timestamp(),
  status: messageStatusEnum().notNull().default("sent"),
});

export const usersRealtions = relations(users, ({ one, many }) => ({
  userPrivacySettings: one(userPrivacySettings),
  chats: many(chats),
  friendRequests: many(friendRequests),
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

export type User = typeof users.$inferInsert;
