import { pgTable, integer, pgEnum, boolean } from "drizzle-orm/pg-core";
import { createSelectSchema } from "drizzle-zod";
import { timeStamps } from "./base";
import { users } from "./users";

export const callStatusEnum = pgEnum("call_status", [
  "ringing",
  "answered",
  "missed",
  "declined",
]);

export const calls = pgTable("calls", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  startedAt: integer().notNull(),
  endedAt: integer(),
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
  joinedAt: integer(),
  leftAt: integer(),
  isInitator: boolean(),
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
