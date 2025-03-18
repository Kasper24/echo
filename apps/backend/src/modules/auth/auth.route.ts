import { Router } from "express";
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

authRouter.post("/otp/send", validateHandler(sendOtpSchema), sendOtpController);

authRouter.post(
  "/otp/verify",
  validateHandler(verifyOtpSchema),
  verifyOtpController
);

authRouter.get(
  "/refresh-token",
  validateHandler(refreshTokenSchema),
  refreshTokenController
);

authRouter.get("/logout", logoutController);

export default authRouter;
