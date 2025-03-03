import { pgTable, integer, text, timestamp, uuid } from "drizzle-orm/pg-core";

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

export type NewMessage = typeof messages.$inferInsert;
export type Message = typeof messages.$inferSelect;

export type NewMessageReadReceipt = typeof messageReadReceipts.$inferInsert;
export type MessageReadReceipt = typeof messageReadReceipts.$inferSelect;
