import argon2 from "argon2";
import crypto from "crypto";
import twilio from "twilio";
import { eq } from "drizzle-orm";
import { db } from "@repo/database";
import { otps, refreshTokens, users } from "@repo/database/schema";
import { AuthError } from "@repo/backend/errors";
import {
  jwtSignAccessToken,
  jwtSignRefreshToken,
  jwtVerifyAccessToken,
  jwtVerifyRefreshToken,
} from "@repo/backend/utils/jwt";
import { attempt } from "@repo/backend/utils";

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const sendOtp = async (phoneNumber: string) => {
  const otp = crypto.randomInt(100000, 999999).toString().slice(0, 6);
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  await db
    .insert(otps)
    .values({
      phoneNumber,
      otp,
      expiresAt,
    })
    .onConflictDoUpdate({
      target: otps.phoneNumber,
      set: { otp, expiresAt, updatedAt: new Date() },
    });

  // await twilioClient.messages.create({
  //   body: `Your OTP is: ${otp}`,
  //   from: process.env.TWILIO_PHONE_NUMBER,
  //   to: `+${phoneNumber}`,
  // });
};

const checkOtpStatus = async (phoneNumber: string) => {
  const otp = await db.query.otps.findFirst({
    where: eq(otps.phoneNumber, phoneNumber),
  });

  if (!otp || otp.expiresAt < new Date()) {
    throw new AuthError("OTP expired or invalid.");
  }

  return true;
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
  await db
    .insert(refreshTokens)
    .values({
      userId: user.id,
      token: hashedToken,
    })
    .onConflictDoUpdate({
      target: refreshTokens.userId,
      set: { token: hashedToken, updatedAt: new Date() },
    });

  return { accessToken, refreshToken };
};

const verify = async (accessToken: string) => {
  const [error] = await attempt(() => jwtVerifyAccessToken(accessToken));
  if (error) throw new AuthError("Invalid access token.");

  return true;
};

const refreshAccessToken = async (refreshToken: string) => {
  const [error, data] = await attempt(() =>
    jwtVerifyRefreshToken(refreshToken)
  );
  if (error) throw new AuthError(error.message);

  const user = await db.query.users.findFirst({
    where: eq(users.id, data.userId),
  });
  if (!user) throw new AuthError("Invalid refresh token");

  const storedToken = await db.query.refreshTokens.findFirst({
    where: eq(refreshTokens.userId, data.userId),
  });
  if (!storedToken) throw new AuthError("Invalid refresh token.");

  const isTokenValid = await argon2.verify(storedToken.token, refreshToken);
  if (!isTokenValid) throw new AuthError("isTokenValid");

  const accessToken = jwtSignAccessToken({ userId: user.id });

  return { accessToken };
};

const logout = async (refreshToken: string) => {
  const [error, data] = await attempt(() =>
    jwtVerifyRefreshToken(refreshToken)
  );
  if (error) return;

  await db.delete(refreshTokens).where(eq(refreshTokens.userId, data.userId));
};

export {
  sendOtp,
  checkOtpStatus,
  verifyOtp,
  verify,
  refreshAccessToken,
  logout,
};
