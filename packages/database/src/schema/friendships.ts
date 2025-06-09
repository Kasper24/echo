import { pgTable, integer, primaryKey, pgEnum } from "drizzle-orm/pg-core";
import { createSelectSchema } from "drizzle-zod";

import { users } from "./users";
import { timeStamps } from "./base";

export const friendStatusEnum = pgEnum("friend_status", [
  "pending",
  "accepted",
  "denied",
]);

export const friends = pgTable(
  "friends",
  {
    userA: integer()
      .notNull()
      .references(() => users.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    userB: integer()
      .notNull()
      .references(() => users.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    status: friendStatusEnum().notNull().default("pending"),
    ...timeStamps(false),
  },
  (table) => [primaryKey({ columns: [table.userA, table.userB] })]
);

export const blockedUsers = pgTable("blocked_users", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  blockerId: integer()
    .notNull()
    .references(() => users.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),
  blockedId: integer()
    .notNull()
    .references(() => users.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),
  ...timeStamps(false),
});

export type NewFriend = typeof friends.$inferInsert;
export type Friend = typeof friends.$inferSelect;
export const friendSelectSchema = createSelectSchema(friends);

export type NewBlockedUser = typeof blockedUsers.$inferInsert;
export type BlockedUser = typeof blockedUsers.$inferSelect;
export const blockedUserSelectSchema = createSelectSchema(blockedUsers);
