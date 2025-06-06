import { pgEnum } from "drizzle-orm/pg-core";

export const friendStatusEnum = pgEnum("friend_status", [
  "pending",
  "accepted",
  "denied",
]);
export const chatTypeEnum = pgEnum("chat_type", ["direct", "group"]);
export const userRoleEnum = pgEnum("user_role", ["admin", "user"]);
export const messageAttachmentTypeEnum = pgEnum("attachment_type", [
  "image",
  "video",
  "audio",
  "file",
]);
