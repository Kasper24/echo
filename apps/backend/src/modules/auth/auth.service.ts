import argon2 from "argon2";
import crypto from "crypto";
import twilio from "twilio";
import { eq } from "drizzle-orm";
import { db } from "@repo/backend/database";
import { otps, refreshTokens, users } from "@repo/backend/database/schema";
import { AuthError } from "@repo/backend/utils/errors";
import {
  jwtSignAccessToken,
  jwtSignRefreshToken,
  jwtVerifyRefreshToken,
} from "@repo/backend/utils/jwt";

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const sendOtp = async (phoneNumber: string) => {
  const otp = crypto.randomInt(100000, 999999).toString().slice(0, 6);
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  await db.delete(otps).where(eq(otps.phoneNumber, phoneNumber));

  await db.insert(otps).values({
    phoneNumber,
    otp,
    expiresAt,
  });

  await twilioClient.messages.create({
    body: `Your OTP is: ${otp}`,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: `+${phoneNumber}`,
  });
};

const verifyOtp = async (phoneNumber: string, otp: string) => {
  const existingOtp = await db.query.otps.findFirst({
    where: eq(otps.phoneNumber, phoneNumber),
  });

  if (
    !existingOtp ||
    existingOtp.expiresAt < new Date() ||
    existingOtp.otp !== otp
  ) {
    throw new AuthError("OTP expired or invalid.");
  }

  await db.delete(otps).where(eq(otps.phoneNumber, phoneNumber));

  let user = await db.query.users.findFirst({
    where: eq(users.phoneNumber, phoneNumber),
  });

  if (!user) {
    user = (
      await db
        .insert(users)
        .values({
          phoneNumber,
        })
        .returning()
    )[0];
  }

  const accessToken = jwtSignAccessToken({ userId: user.id });
  const refreshToken = jwtSignRefreshToken({ userId: user.id });

  const hashedToken = await argon2.hash(refreshToken);

  await db.delete(refreshTokens).where(eq(refreshTokens.userId, user.id));

  await db.insert(refreshTokens).values({
    userId: user.id,
    token: hashedToken,
  });

  return { accessToken, refreshToken };
};

const refreshAccessToken = async (refreshToken: string) => {
  const { userId } = jwtVerifyRefreshToken(refreshToken);
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });
  if (!user) throw new AuthError("Invalid refresh token.");

  const storedToken = await db.query.refreshTokens.findFirst({
    where: eq(refreshTokens.userId, userId),
  });
  if (!storedToken) throw new AuthError("Invalid refresh token.");

  const isTokenValid = await argon2.verify(storedToken.token, refreshToken);
  if (!isTokenValid) {
    throw new AuthError("Invalid refresh token.");
  }

  return jwtSignAccessToken({ userId: user.id });
};

const logout = async (refreshToken: string) => {
  const { userId } = jwtVerifyRefreshToken(refreshToken);
  if (!userId) return;

  await db.delete(refreshTokens).where(eq(refreshTokens.userId, userId));
};

export { sendOtp, verifyOtp, refreshAccessToken, logout };
