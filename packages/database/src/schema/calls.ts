import {
  pgTable,
  integer,
  pgEnum,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";
import { createSelectSchema } from "drizzle-zod";
import { timeStamps } from "./base";
import { users } from "./users";
import { chats } from "./chats";

export const callStatusEnum = pgEnum("call_status", [
  "ringing",
  "answered",
  "missed",
  "declined",
]);

export const calls = pgTable("calls", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  chatId: integer()
    .references(() => chats.id)
    .notNull(),
  startedAt: timestamp().defaultNow().notNull(),
  endedAt: timestamp(),
  createdBy: integer()
    .references(() => users.id)
    .notNull(),
  ...timeStamps(false),
});

export const callParticipants = pgTable("call_participants", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  callId: integer()
    .references(() => calls.id)
    .notNull(),
  userId: integer()
    .references(() => users.id)
    .notNull(),
  status: callStatusEnum().notNull().default("ringing"),
  joinedAt: timestamp(),
  leftAt: timestamp(),
  isMuted: boolean().notNull().default(false),
  isVideoEnabled: boolean().notNull().default(false),
  isScreenSharing: boolean().notNull().default(false),
  ...timeStamps(false),
});

export type NewCall = typeof calls.$inferInsert;
export type Call = typeof calls.$inferSelect;
export const callSelectSchema = createSelectSchema(calls);

export type NewCallParticipant = typeof callParticipants.$inferInsert;
export type CallParticipant = typeof callParticipants.$inferSelect;
export const callParticipantSelectSchema = createSelectSchema(callParticipants);
