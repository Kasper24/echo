import {
  pgTable,
  integer,
  varchar,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { timeStamps } from "./base";

export const otps = pgTable("otps", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  phoneNumber: varchar({ length: 15 }).unique().notNull(),
  otp: varchar({ length: 6 }).notNull(),
  expiresAt: timestamp().notNull(),
  ...timeStamps(false),
});

export const refreshTokens = pgTable("refresh_tokens", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: integer()
    .unique()
    .notNull()
    .references(() => users.id, { onDelete: "cascade", onUpdate: "cascade" }),
  token: text().notNull().unique(),
  ...timeStamps(false),
});

export type NewOtp = typeof otps.$inferInsert;
export type Otp = typeof otps.$inferSelect;

export type NewRefreshToken = typeof refreshTokens.$inferInsert;
export type RefreshToken = typeof refreshTokens.$inferSelect;
