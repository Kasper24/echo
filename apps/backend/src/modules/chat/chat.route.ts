import { Router, Response } from "express";
import { AuthenticatedRequest } from "@repo/backend/middlewares/auth";
import validateHandler from "@repo/backend/middlewares/validation";
import {
  getChatsController,
  getChatDetailsController,
  getChatMessagesController,
} from "./chat.controller";
import { getChatDetailsSchema } from "./chat.schema";

const chatRouter = Router();

chatRouter.get("/", async (req, res) => {
  await getChatsController(req as AuthenticatedRequest, res as Response);
});
chatRouter.get(
  "/:chatId",
  validateHandler(getChatDetailsSchema),
  async (req, res) => {
    await getChatDetailsController(
      req as AuthenticatedRequest,
      res as Response
    );
  }
);
chatRouter.get(
  "/:chatId/messages",
  validateHandler(getChatDetailsSchema),
  async (req, res) => {
    await getChatMessagesController(
      req as AuthenticatedRequest,
      res as Response
    );
  }
);

export default chatRouter;
