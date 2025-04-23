import { and, eq, not, or } from "drizzle-orm";
import { db } from "@repo/database";
import { blockedUsers, friends, users } from "@repo/database/schema";
import { BadRequestError } from "@repo/backend/errors";

const getBlockedUsers = async (userId: number) => {
  return await db.query.blockedUsers.findMany({
    where: eq(blockedUsers.blockerId, userId),
    with: {
      blocked: true,
    },
  });
};

const blockUser = async (userId: number, blockUserId: number) => {
  if (userId === blockUserId)
    throw new BadRequestError("You can't block yourself.");

  const blockedUser = await db.query.blockedUsers.findFirst({
    where: and(
      eq(blockedUsers.blockerId, userId),
      eq(blockedUsers.blockedId, blockUserId)
    ),
  });

  if (blockedUser) throw new BadRequestError("You already blocked this user.");

  await db.insert(blockedUsers).values({
    blockerId: userId,
    blockedId: blockUserId,
  });
};

const unblockUser = async (userId: number, unblockUserId: number) => {
  if (userId === unblockUserId)
    throw new BadRequestError("You can't unblock yourself.");

  const result = await db
    .delete(friends)
    .where(
      and(
        eq(blockedUsers.blockerId, userId),
        eq(blockedUsers.blockedId, unblockUserId)
      )
    )
    .returning();

  if (result.length === 0)
    throw new BadRequestError("User not found or already unblocked.");
};

export { getBlockedUsers, blockUser, unblockUser };
