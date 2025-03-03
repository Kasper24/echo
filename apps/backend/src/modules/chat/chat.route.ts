import { Router, Response } from "express";
import { AuthenticatedRequest } from "@repo/backend/middlewares/auth";
import validateHandler from "@repo/backend/middlewares/validation";
import {
  getChatsController,
  getChatDetailsController,
} from "./chat.controller";
import { getChatDetailsSchema } from "./chat.schema";

const chatRouter = Router();

chatRouter.get("/", (req, res) => {
  getChatsController(req as AuthenticatedRequest, res as Response);
});
chatRouter.post("/:id", validateHandler(getChatDetailsSchema), (req, res) => {
  getChatDetailsController(req as AuthenticatedRequest, res as Response);
});

export default chatRouter;
