import { pgTable, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createSelectSchema } from "drizzle-zod";
import { timeStamps } from "./base";
import { chats } from "./chats";
import { users } from "./users";
import { messageAttachmentTypeEnum } from "./enums";

export const messages = pgTable("messages", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
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
  ...timeStamps(false),
});

export const messageAttachments = pgTable("message_attachments", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  messageId: integer()
    .references(() => messages.id)
    .notNull(),
  type: messageAttachmentTypeEnum().notNull(),
  name: text().notNull(),
  url: text().notNull(),
  ...timeStamps(false),
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
  receivedAt: timestamp(),
  readAt: timestamp(),
});

export type NewMessage = typeof messages.$inferInsert;
export type Message = typeof messages.$inferSelect;
export const messageSelectSchema = createSelectSchema(messages);

export type NewMessageAttachment = typeof messageAttachments.$inferInsert;
export type MessageAttachment = typeof messageAttachments.$inferSelect;
export const messageAttachmentSelectSchema =
  createSelectSchema(messageAttachments);

export type NewMessageReadReceipt = typeof messageReadReceipts.$inferInsert;
export type MessageReadReceipt = typeof messageReadReceipts.$inferSelect;
export const messageReadReceiptSelectSchema =
  createSelectSchema(messageReadReceipts);
