import { timestamp } from "drizzle-orm/pg-core";

const timeStamps = (softDelete = false) => {
  const commonTimestamps = {
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp({ withTimezone: true }),
  };
  const deleteTimestamp = {
    deletedAt: timestamp({ withTimezone: true }),
  };
  return softDelete
    ? { ...commonTimestamps, ...deleteTimestamp }
    : commonTimestamps;
};

export { timeStamps };
