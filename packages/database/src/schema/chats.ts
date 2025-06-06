import { pgTable, integer, text } from "drizzle-orm/pg-core";
import { createSelectSchema } from "drizzle-zod";
import { timeStamps } from "./base";
import { chatTypeEnum, userRoleEnum } from "./enums";
import { users } from "./users";

export const chats = pgTable("chats", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  type: chatTypeEnum().notNull().default("direct"),
  name: text().notNull(),
  description: text().notNull(),
  picture: text(),
  ...timeStamps(false),
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
  ...timeStamps(false),
});

export type NewChat = typeof chats.$inferInsert;
export type Chat = typeof chats.$inferSelect;
export const chatSelectSchema = createSelectSchema(chats);

export type NewChatParticipant = typeof chatParticipants.$inferInsert;
export type ChatParticipant = typeof chatParticipants.$inferSelect;
export const chatParticipantSelectSchema = createSelectSchema(chatParticipants);
