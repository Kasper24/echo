import { Router, Response } from "express";
import { AuthenticatedRequest } from "@repo/backend/middlewares/auth";
import validateHandler from "@repo/backend/middlewares/validation";
import {
  getBlockedUsersController,
  blockUserController,
  unblockUserController,
} from "./block.controller";
import { blockSchema } from "./block.schema";

const blockRouter = Router();

blockRouter.get("/", async (req, res) => {
  await getBlockedUsersController(req as AuthenticatedRequest, res as Response);
});

blockRouter.post("/:userId", validateHandler(blockSchema), async (req, res) => {
  await blockUserController(req as AuthenticatedRequest, res as Response);
});

blockRouter.delete(
  "/:userId",
  validateHandler(blockSchema),
  async (req, res) => {
    await unblockUserController(req as AuthenticatedRequest, res as Response);
  }
);

export default blockRouter;
