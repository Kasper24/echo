import { and, eq } from "drizzle-orm";
import { db } from "@repo/database";
import { User, users } from "@repo/database/schema";
import { BadRequestError, NotFoundError } from "@repo/backend/utils/errors";

const getUser = async (userId: number) => {
  const me = await db.query.users.findFirst({
    where: and(eq(users.id, userId)),
  });
  if (!me) throw new BadRequestError("User not found.");

  return me;
};

const updateUser = async (userId: number, updatedUser: Partial<User>) => {
  const user = await db
    .update(users)
    .set({
      updatedAt: new Date(),
      ...updatedUser,
    })
    .where(eq(users.id, userId))
    .returning();

  if (!user.length) throw new NotFoundError("User not found.");

  return user[0];
};

export { getUser, updateUser };
