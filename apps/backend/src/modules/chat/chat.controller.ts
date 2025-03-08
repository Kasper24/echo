import { Response } from "express";
import { StatusCodes } from "http-status-codes";
import { getChats, getChatDetails } from "./chat.service";
import { AuthenticatedRequest } from "@repo/backend/middlewares/auth";

const getChatsController = async (req: AuthenticatedRequest, res: Response) => {
  const chats = await getChats(req.user.id);
  res.status(StatusCodes.OK).json({ chats });
};

const getChatDetailsController = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  const { chatId } = req.params;
  const { page, limit } = req.query;
  const chatDetails = await getChatDetails(
    req.user.id,
    parseInt(chatId),
    parseInt(page as string),
    parseInt(limit as string),
  );
  res.status(StatusCodes.OK).json({ chatDetails });
};

export { getChatsController, getChatDetailsController };
