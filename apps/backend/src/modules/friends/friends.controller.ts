import { Response } from "express";
import { StatusCodes } from "http-status-codes";
import { AuthenticatedRequest } from "@repo/backend/middlewares/auth";
import {
  getFriends,
  addFriend,
  deleteFriend,
  acceptFriendRequest,
  denyFriendRequest,
} from "./friends.service";

const getFriendsController = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const friends = await getFriends(req.userId);
  res.status(StatusCodes.OK).json({ friends });
};

const addFriendController = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const { friendId } = req.params;
  await addFriend(req.userId, parseInt(friendId));
  res
    .status(StatusCodes.OK)
    .json({ message: "Friend request sent successfully." });
};

const deleteFriendController = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const { friendId } = req.params;
  await deleteFriend(req.userId, parseInt(friendId));
  res.status(StatusCodes.OK).json({ message: "Friend deleted successfully." });
};

const acceptFriendRequestController = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const { friendId } = req.params;
  await acceptFriendRequest(req.userId, parseInt(friendId));
  res.status(StatusCodes.OK).json({ message: "Friend request accepted." });
};

const denyFriendRequestController = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const { friendId } = req.params;
  await denyFriendRequest(req.userId, parseInt(friendId));
  res.status(StatusCodes.OK).json({ message: "Friend request denied." });
};

export {
  getFriendsController,
  addFriendController,
  deleteFriendController,
  acceptFriendRequestController,
  denyFriendRequestController,
};
