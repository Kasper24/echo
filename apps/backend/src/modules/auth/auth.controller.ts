import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { sendOtp, verifyOtp, refreshAccessToken, logout } from "./auth.service";

const sendOtpController = async (req: Request, res: Response) => {
  const { phoneNumber } = req.body;
  await sendOtp(phoneNumber);
  res.status(StatusCodes.OK).json({ message: "OTP was sent successfully." });
};

const verifyOtpController = async (req: Request, res: Response) => {
  const { phoneNumber, otp } = req.body;
  const { accessToken, refreshToken } = await verifyOtp(phoneNumber, otp);
  res.cookie(process.env.JWT_ACCESS_TOKEN_COOKIE_KEY, accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: process.env.JWT_ACCESS_TOKEN_MAX_AGE,
  });
  res.cookie(process.env.JWT_REFRESH_TOKEN_COOKIE_KEY, refreshToken, {
    httpOnly: true,
    secure: false,
    sameSite: "none",
    maxAge: process.env.JWT_REFRESH_TOKEN_MAX_AGE,
  });
  res.status(StatusCodes.CREATED).json({ accessToken });
};

const refreshTokenController = async (req: Request, res: Response) => {
  const refreshToken = req.cookies[process.env.JWT_REFRESH_TOKEN_COOKIE_KEY];
  const accessToken = await refreshAccessToken(refreshToken);
  res.cookie(process.env.JWT_ACCESS_TOKEN_COOKIE_KEY, accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: process.env.JWT_ACCESS_TOKEN_MAX_AGE,
  });
  res.status(StatusCodes.OK).json({ accessToken });
};

const logoutController = async (req: Request, res: Response) => {
  const refreshToken = req.cookies[process.env.JWT_REFRESH_TOKEN_COOKIE_KEY];
  await logout(refreshToken);
  res.clearCookie(process.env.JWT_ACCESS_TOKEN_COOKIE_KEY);
  res.clearCookie(process.env.JWT_REFRESH_TOKEN_COOKIE_KEY);
  res.status(StatusCodes.OK).json({ message: "Logged out successfully." });
};

export {
  sendOtpController,
  verifyOtpController,
  refreshTokenController,
  logoutController,
};
