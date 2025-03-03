import {
  pgTable,
  integer,
  varchar,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { users } from "./users";

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

export type NewOtp = typeof otps.$inferInsert;
export type Otp = typeof otps.$inferSelect;

export type NewRefreshToken = typeof refreshTokens.$inferInsert;
export type RefreshToken = typeof refreshTokens.$inferSelect;
