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

friendsRouter.get("/", (req, res) => {
  getFriendsController(req as AuthenticatedRequest, res as Response);
});

friendsRouter.post("/:friendId", validateHandler(friendsSchema), (req, res) => {
  addFriendController(req as AuthenticatedRequest, res as Response);
});

friendsRouter.delete(
  "/:friendId",
  validateHandler(friendsSchema),
  (req, res) => {
    deleteFriendController(req as AuthenticatedRequest, res as Response);
  },
);

friendsRouter.post(
  "/:friendId/accept",
  validateHandler(friendsSchema),
  (req, res) => {
    acceptFriendRequestController(req as AuthenticatedRequest, res as Response);
  },
);

friendsRouter.post(
  "/:friendId/deny",
  validateHandler(friendsSchema),
  (req, res) => {
    denyFriendRequestController(req as AuthenticatedRequest, res as Response);
  },
);

export default friendsRouter;
