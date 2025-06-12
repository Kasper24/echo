import {
  pgTable,
  integer,
  varchar,
  text,
  timestamp,
  boolean,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createSelectSchema } from "drizzle-zod";
import { timeStamps } from "./base";

export const privacyScopeEnum = pgEnum("privacy_scope", [
  "everyone",
  "contacts",
  "nobody",
]);

export const users = pgTable("users", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  phoneNumber: varchar({ length: 15 }).unique().notNull(),
  name: varchar({ length: 255 }).notNull().default("New User"),
  picture: text(),
  description: text().default("Hello, I'm a new user!"),
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
  showPicture: privacyScopeEnum().notNull().default("everyone"),
  showDescription: privacyScopeEnum().notNull().default("everyone"),
  showStatus: privacyScopeEnum().notNull().default("everyone"),
  showLastSeen: privacyScopeEnum().notNull().default("everyone"),
  showReadReceipts: privacyScopeEnum().notNull().default("everyone"),
  allowCalls: privacyScopeEnum().notNull().default("everyone"),
  allowMessages: privacyScopeEnum().notNull().default("everyone"),
  ...timeStamps(false),
});

export type NewUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export const userSelectSchema = createSelectSchema(users);

export type NewUserPrivacySettings = typeof userPrivacySettings.$inferInsert;
export type UserPrivacySettings = typeof userPrivacySettings.$inferSelect;
export const userPrivacySelectSchema = createSelectSchema(userPrivacySettings);
