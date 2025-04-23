import { Router, Response } from "express";
import { AuthenticatedRequest } from "@repo/backend/middlewares/auth";
import validateHandler from "@repo/backend/middlewares/validation";
import {
  getFriendsController,
  addFriendController,
  deleteFriendController,
  acceptFriendRequestController,
  denyFriendRequestController,
} from "./friends.controller";
import { friendsSchema } from "./friends.schema";

const friendsRouter = Router();

friendsRouter.get("/", async (req, res) => {
  await getFriendsController(req as AuthenticatedRequest, res as Response);
});

friendsRouter.post("/:friendId", validateHandler(friendsSchema), async (req, res) => {
  await addFriendController(req as AuthenticatedRequest, res as Response);
});

friendsRouter.delete(
  "/:friendId",
  validateHandler(friendsSchema),
  async (req, res) => {
    await deleteFriendController(req as AuthenticatedRequest, res as Response);
  },
);

friendsRouter.post(
  "/:friendId/accept",
  validateHandler(friendsSchema),
  async (req, res) => {
    await acceptFriendRequestController(req as AuthenticatedRequest, res as Response);
  },
);

friendsRouter.post(
  "/:friendId/deny",
  validateHandler(friendsSchema),
  async (req, res) => {
    await denyFriendRequestController(req as AuthenticatedRequest, res as Response);
  },
);

export default friendsRouter;
