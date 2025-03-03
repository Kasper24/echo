import { and, eq, not, or } from "drizzle-orm";
import { db } from "@repo/backend/database";
import { friends, users } from "@repo/backend/database/schema";
import { BadRequestError } from "@repo/backend/utils/errors";

const getFriends = async (userId: number) => {
  const acceptedFriends = await db
    .select({
      id: users.id,
      phoneNumber: users.phoneNumber,
      displayName: users.displayName,
      profilePicture: users.profilePicture,
      about: users.about,
      status: users.status,
    })
    .from(friends)
    .innerJoin(
      users,
      and(
        eq(friends.status, "accepted"),
        or(eq(friends.userA, userId), eq(friends.userB, userId))
      )
    )
    .where(
      and(
        not(eq(users.id, userId)) // Exclude self from results
      )
    );

  const friendsRequestsSent = await db
    .select({
      id: users.id,
      phoneNumber: users.phoneNumber,
      displayName: users.displayName,
      profilePicture: users.profilePicture,
      about: users.about,
      status: users.status,
    })
    .from(friends)
    .where(and(eq(friends.userA, userId), eq(friends.status, "pending")))
    .innerJoin(users, eq(friends.userB, users.id));

  const friendsRequestsReceived = await db
    .select({
      id: users.id,
      phoneNumber: users.phoneNumber,
      displayName: users.displayName,
      profilePicture: users.profilePicture,
      about: users.about,
      status: users.status,
    })
    .from(friends)
    .where(and(eq(friends.userB, userId), eq(friends.status, "pending")))
    .innerJoin(users, eq(friends.userA, users.id));

  return {
    acceptedFriends,
    friendsRequestsSent,
    friendsRequestsReceived,
  };
};

const addFriend = async (userId: number, friendId: number) => {
  if (userId === friendId)
    throw new BadRequestError("You can't send a friend request to yourself");

  const friendship = await db.query.friends.findFirst({
    where: or(
      and(eq(friends.userA, userId), eq(friends.userB, friendId)),
      and(eq(friends.userB, userId), eq(friends.userA, friendId))
    ),
    with: {
      userA: true,
      userB: true,
    },
  });

  if (friendship?.status === "accepted")
    throw new BadRequestError("You already have a friendship with this user");

  if (friendship?.status === "pending") {
    if (friendship.userB.id === userId)
      throw new BadRequestError("Please accept or deny this friend request");
    else if (friendship.userA.id === userId)
      throw new BadRequestError("Friend request already exists");
  }

  await db.insert(friends).values({
    status: "pending",
    userA: userId,
    userB: friendId,
  });
};

const deleteFriend = async (userId: number, friendId: number) => {
  const result = await db
    .delete(friends)
    .where(
      or(
        and(eq(friends.userA, userId), eq(friends.userB, friendId)),
        and(eq(friends.userB, userId), eq(friends.userA, friendId))
      )
    )
    .returning();

  if (result.length === 0)
    throw new BadRequestError("Friend not found or already deleted.");
};

const acceptFriendRequest = async (userId: number, friendId: number) => {
  const result = await db
    .update(friends)
    .set({ status: "accepted" })
    .where(
      and(
        eq(friends.userA, userId),
        eq(friends.userB, friendId),
        eq(friends.status, "pending")
      )
    )
    .returning();

  if (result.length === 0)
    throw new BadRequestError("Friend request not found or already accepted.");
};

const denyFriendRequest = async (userId: number, friendId: number) => {
  const result = await db
    .update(friends)
    .set({ status: "denied" })
    .where(
      and(
        eq(friends.userA, userId),
        eq(friends.userB, friendId),
        eq(friends.status, "pending")
      )
    )
    .returning();

  if (result.length === 0)
    throw new BadRequestError("Friend request not found or already denied.");
};

export {
  getFriends,
  addFriend,
  deleteFriend,
  acceptFriendRequest,
  denyFriendRequest,
};
