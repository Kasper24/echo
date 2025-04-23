import { Response } from "express";
import { StatusCodes } from "http-status-codes";
import { AuthenticatedRequest } from "@repo/backend/middlewares/auth";
import { getBlockedUsers, blockUser, unblockUser } from "./block.service";

const getBlockedUsersController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const blockedUsers = await getBlockedUsers(req.userId);
  res.status(StatusCodes.OK).json({ blockedUsers });
};

const blockUserController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const { blockUserId } = req.params;
  await blockUser(req.userId, parseInt(blockUserId));
  res.status(StatusCodes.OK).json({ message: "User blocked successfully." });
};

const unblockUserController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const { unblockUserId } = req.params;
  await unblockUser(req.userId, parseInt(unblockUserId));
  res.status(StatusCodes.OK).json({ message: "User unblocked successfully." });
};

export {
  getBlockedUsersController,
  blockUserController,
  unblockUserController,
};
