import { Router, Response } from "express";
import { AuthenticatedRequest } from "@repo/backend/middlewares/auth";
import { getUserController, updateUserController } from "./user.controller";
import validateHandler from "@repo/backend/middlewares/validation";
import { updateUserSchema } from "./user.schema";

const userRouter = Router();

userRouter.get("/", (req, res) => {
  getUserController(req as AuthenticatedRequest, res as Response);
});

userRouter.patch("/", validateHandler(updateUserSchema), (req, res) => {
  updateUserController(req as AuthenticatedRequest, res as Response);
});

export default userRouter;
