import { pgTable, integer, text, timestamp } from "drizzle-orm/pg-core";

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

export type NewChat = typeof chats.$inferInsert;
export type Chat = typeof chats.$inferSelect;

export type NewChatParticipant = typeof chatParticipants.$inferInsert;
export type ChatParticipant = typeof chatParticipants.$inferSelect;
