import {
  pgTable,
  integer,
  varchar,
  text,
  timestamp,
  boolean,
} from "drizzle-orm/pg-core";
import { timeStamps } from "./base";

export const users = pgTable("users", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  phoneNumber: varchar({ length: 15 }).notNull(),
  displayName: varchar({ length: 255 }).notNull(),
  profilePicture: text(),
  about: text().default("Hello, I'm a new user!"),
  status: boolean().notNull().default(false),
  lastSeen: timestamp().notNull().defaultNow(),
  ...timeStamps(false),
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
  ...timeStamps(false),
});

export type NewUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type NewUserPrivacySettings = typeof userPrivacySettings.$inferInsert;
export type UserPrivacySettings = typeof userPrivacySettings.$inferSelect;
