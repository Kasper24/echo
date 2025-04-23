import { Router } from "express";
import validateHandler from "@repo/backend/middlewares/validation";
import rateLimitHandler from "@repo/backend/middlewares/rate-limit";
import {
  sendOtpController,
  checkOtpStatusController,
  verifyOtpController,
  verifyController,
  refreshTokenController,
  logoutController,
} from "./auth.controller";
import {
  sendOtpSchema,
  verifyOtpSchema,
  verifySchema,
  refreshTokenSchema,
  statusOtpSchema,
} from "./auth.schema";

const authRouter = Router();

const sendOtpLimiter = rateLimitHandler({
  endpoint: "/otp/send",
  timeSpan: "5m",
  limit: 5,
  message: "Too many SMS messages have been sent to this number recently",
});

authRouter.post(
  "/otp/send",
  sendOtpLimiter,
  validateHandler(sendOtpSchema),
  sendOtpController
);

const verifyOtplimiter = rateLimitHandler({
  endpoint: "/otp/verify",
  timeSpan: "5m",
  limit: 5,
});

authRouter.post(
  "/otp/status",
  validateHandler(statusOtpSchema),
  checkOtpStatusController
);

authRouter.post(
  "/otp/verify",
  verifyOtplimiter,
  validateHandler(verifyOtpSchema),
  verifyOtpController
);

authRouter.get("/verify", validateHandler(verifySchema), verifyController);

authRouter.get(
  "/refresh-token",
  validateHandler(refreshTokenSchema),
  refreshTokenController
);

authRouter.get("/logout", logoutController);

export default authRouter;
