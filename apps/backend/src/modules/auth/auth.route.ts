import { Router } from "express";
import asyncHandler from "@repo/backend/middlewares/async";
import validateHandler from "@repo/backend/middlewares/validation";
import {
  sendOtpController,
  verifyOtpController,
  refreshTokenController,
  logoutController,
} from "./auth.controller";
import {
  sendOtpSchema,
  verifyOtpSchema,
  refreshTokenSchema,
} from "./auth.schema";

const authRouter = Router();

authRouter.post(
  "/send-otp",
  validateHandler(sendOtpSchema),
  asyncHandler(sendOtpController)
);

authRouter.post(
  "/verify-otp",
  validateHandler(verifyOtpSchema),
  asyncHandler(verifyOtpController)
);

authRouter.get(
  "/refresh-token",
  validateHandler(refreshTokenSchema),
  asyncHandler(refreshTokenController)
);

authRouter.get("/logout", asyncHandler(logoutController));

export default authRouter;
