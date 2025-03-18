import { Response } from "express";
import { StatusCodes } from "http-status-codes";
import { AuthenticatedRequest } from "@repo/backend/middlewares/auth";
import { getUser, updateUser } from "./user.service";

const getUserController = async (req: AuthenticatedRequest, res: Response) => {
  const user = await getUser(req.userId);
  res.status(StatusCodes.OK).json({ user });
};

const updateUserController = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const { updatedUser } = req.body;
  const user = await updateUser(req.userId, updatedUser);
  res.status(StatusCodes.OK).json({ user });
};

export { getUserController, updateUserController };
