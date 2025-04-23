import { Router, Response } from "express";
import { AuthenticatedRequest } from "@repo/backend/middlewares/auth";
import { getUserController, updateUserController } from "./user.controller";
import validateHandler from "@repo/backend/middlewares/validation";
import { updateUserSchema } from "./user.schema";

const userRouter = Router();

userRouter.get("/", async (req, res) => {
  await getUserController(req as AuthenticatedRequest, res as Response);
});

userRouter.patch("/", validateHandler(updateUserSchema), async (req, res) => {
  await updateUserController(req as AuthenticatedRequest, res as Response);
});

export default userRouter;
