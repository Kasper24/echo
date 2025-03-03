import { pgTable, integer, timestamp, primaryKey } from "drizzle-orm/pg-core";
import { users } from "./users";
import { friendStatusEnum } from "./enums";

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
  createdAt: timestamp().notNull().defaultNow(),
});

export type NewFriend = typeof friends.$inferInsert;
export type Friend = typeof friends.$inferSelect;
export type NewBlockedUser = typeof blockedUsers.$inferInsert;
export type BlockedUser = typeof blockedUsers.$inferSelect;
