const createMessageMock = jest.fn().mockImplementation(() => ({
  sid: "mocked-message-sid",
}));

import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import supertest from "supertest";
import { eq } from "drizzle-orm";
import argon2 from "argon2";
import { createServer } from "@repo/backend/server";
import { db } from "@repo/database";
import { otps, refreshTokens, users } from "@repo/database/schema";
import { jwtSignRefreshToken } from "@repo/backend/utils/jwt";

jest.mock("twilio", () => {
  return jest.fn(() => ({
    messages: {
      create: createMessageMock,
    },
  }));
});

describe("Auth API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.TWILIO_PHONE_NUMBER = "1234567890";
    process.env.JWT_ACCESS_TOKEN_SECRET = "secret";
    process.env.JWT_REFRESH_TOKEN_SECRET = "secret";
    process.env.JWT_ACCESS_TOKEN_EXPIRY = "15m";
    process.env.JWT_REFRESH_TOKEN_EXPIRY = "7d";
    process.env.JWT_REFRESH_TOKEN_MAX_AGE = 1000 * 60 * 60 * 24;
    process.env.JWT_REFRESH_TOKEN_COOKIE_KEY = "refreshToken";
  });

  describe("POST /send-otp", () => {
    it("should send an OTP successfully", async () => {
      const phoneNumber = "1234567890";

      const res = await supertest(createServer())
        .post("/api/v1/auth/send-otp")
        .set("Content-Type", "application/json")
        .send({ phoneNumber });

      const otp = await db.query.otps.findFirst({
        where: eq(otps.phoneNumber, phoneNumber),
      });
      expect(otp).toBeDefined();

      expect(createMessageMock).toHaveBeenCalledWith({
        body: expect.stringContaining(otp!.otp),
        from: process.env.TWILIO_PHONE_NUMBER,
        to: `+${phoneNumber}`,
      });
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ message: "OTP was sent successfully." });
    });

    it("should return 400 if phoneNumber is missing", async () => {
      const res = await supertest(createServer())
        .post("/api/v1/auth/send-otp")
        .send({});

      expect(res.status).toBe(400);
    });
  });

  describe("POST /auth/verify-otp", () => {
    it("should verify OTP, create user if not exists, and return tokens", async () => {
      const phoneNumber = "1234567890";
      const otpCode = "123456";

      // Insert an OTP into the database
      await db.insert(otps).values({
        phoneNumber,
        otp: otpCode,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // Valid for 5 minutes
      });

      const response = await supertest(createServer())
        .post("/api/v1/auth/verify-otp")
        .send({ phoneNumber, otp: otpCode });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("accessToken");

      // Verify user was created
      const user = await db.query.users.findFirst({
        where: eq(users.phoneNumber, phoneNumber),
      });
      expect(user).toBeDefined();

      // Verify refresh token stored in DB
      const refreshTokenRow = await db.query.refreshTokens.findFirst({
        where: eq(refreshTokens.userId, user!.id),
      });
      expect(refreshTokenRow).toBeDefined();

      const cookie = response.headers["set-cookie"];
      expect(cookie).toBeDefined();
      expect(cookie[0]).toContain(process.env.JWT_REFRESH_TOKEN_COOKIE_KEY);

      const startIndex = cookie[0].indexOf("secret=") + "secret=".length;
      const endIndex = cookie[0].indexOf(";", startIndex);
      const extractedToken = cookie[0].slice(startIndex, endIndex);
      expect(await argon2.verify(refreshTokenRow!.token, extractedToken)).toBe(
        true
      );
    });

    it("should fail if OTP belongs to a different phone number", async () => {
      const phoneNumber = "1234567890";
      const otpCode = "123456";

      // Insert an OTP into the database
      await db.insert(otps).values({
        phoneNumber: "9876543210",
        otp: otpCode,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // Valid for 5 minutes
      });

      const response = await supertest(createServer())
        .post("/api/v1/auth/verify-otp")
        .send({ phoneNumber, otp: otpCode });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe("OTP expired or invalid.");
    });

    it("should fail if OTP is expired", async () => {
      const phoneNumber = "1234567890";
      const otpCode = "123456";

      // Insert an OTP into the database
      await db.insert(otps).values({
        phoneNumber,
        otp: otpCode,
        expiresAt: new Date(Date.now() - 1), // Expired
      });

      const response = await supertest(createServer())
        .post("/api/v1/auth/verify-otp")
        .send({ phoneNumber, otp: otpCode });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe("OTP expired or invalid.");
    });

    it("should fail if OTP is invalid", async () => {
      const phoneNumber = "1234567890";
      const otpCode = "113456";

      // Insert an OTP into the database
      await db.insert(otps).values({
        phoneNumber,
        otp: otpCode,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // Valid for 5 minutes
      });

      const response = await supertest(createServer())
        .post("/api/v1/auth/verify-otp")
        .send({ phoneNumber, otp: "123456" });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe("OTP expired or invalid.");
    });
  });

  describe("GET /refresh-token", () => {
    it("should return a new access token", async () => {
      const user = await db
        .insert(users)
        .values({ phoneNumber: "1234567890" })
        .returning();

      const refreshToken = jwtSignRefreshToken({ userId: user[0].id });

      const hashedToken = await argon2.hash(refreshToken);
      await db.insert(refreshTokens).values({
        userId: user[0].id,
        token: hashedToken,
      });

      const response = await supertest(createServer())
        .get("/api/v1/auth/refresh-token")
        .set("Cookie", [
          `${process.env.JWT_REFRESH_TOKEN_COOKIE_KEY}=${refreshToken}`,
        ]);

      expect(response.status).toBe(200);
      expect(response.body.accessToken).toBeTruthy();
    });

    it("should fail if refresh token is invalid", async () => {
      const res = await supertest(createServer())
        .get("/api/v1/auth/refresh-token")
        .set(
          "Cookie",
          `${process.env.JWT_REFRESH_TOKEN_COOKIE_KEY}=invalidToken`
        );

      expect(res.status).toBe(401);
    });

    it("should fail if user is missing", async () => {
      const user = await db
        .insert(users)
        .values({ phoneNumber: "1234567890" })
        .returning();

      const refreshToken = jwtSignRefreshToken({ userId: -1 });

      const hashedToken = await argon2.hash(refreshToken);
      await db.insert(refreshTokens).values({
        userId: user[0].id,
        token: hashedToken,
      });

      const res = await supertest(createServer())
        .get("/api/v1/auth/refresh-token")
        .set(
          "Cookie",
          `${process.env.JWT_REFRESH_TOKEN_COOKIE_KEY}=${refreshToken}`
        );

      expect(res.status).toBe(401);
    });

    it("should fail if refresh token doesn't belong to user", async () => {
      const user1 = await db
        .insert(users)
        .values({ phoneNumber: "1234567890" })
        .returning();
      const user2 = await db
        .insert(users)
        .values({ phoneNumber: "0987654321" })
        .returning();

      const refreshToken = jwtSignRefreshToken({ userId: user1[0].id });
      const hashedToken = await argon2.hash(refreshToken);
      await db.insert(refreshTokens).values({
        userId: user2[0].id,
        token: hashedToken,
      });

      const res = await supertest(createServer())
        .get("/api/v1/auth/refresh-token")
        .set(
          "Cookie",
          `${process.env.JWT_REFRESH_TOKEN_COOKIE_KEY}=${refreshToken}`
        );

      expect(res.status).toBe(401);
    });

    it("should fail if refresh token doesn't exist in database", async () => {
      const user = await db
        .insert(users)
        .values({ phoneNumber: "1234567890" })
        .returning();

      const refreshToken = jwtSignRefreshToken({ userId: user[0].id });
      await db.insert(refreshTokens).values({
        userId: user[0].id,
        token: "invalidToken",
      });

      const res = await supertest(createServer())
        .get("/api/v1/auth/refresh-token")
        .set(
          "Cookie",
          `${process.env.JWT_REFRESH_TOKEN_COOKIE_KEY}=${refreshToken}`
        );

      expect(res.status).toBe(401);
    });
  });

  describe("GET /logout", () => {
    it("should logout the user and clear cookies", async () => {
      const user = await db
        .insert(users)
        .values({ phoneNumber: "1234567890" })
        .returning();

      const refreshToken = jwtSignRefreshToken({ userId: user[0].id });
      const hashedToken = await argon2.hash(refreshToken);
      await db.insert(refreshTokens).values({
        userId: user[0].id,
        token: hashedToken,
      });

      const res = await supertest(createServer())
        .get("/api/v1/auth/logout")
        .set("Cookie", `refreshToken=${refreshToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ message: "Logged out successfully." });
      const cookieHeader = res.headers["set-cookie"].toString();

      expect(
        cookieHeader.includes("Max-Age=0") ||
          cookieHeader.includes("Expires=Thu, 01 Jan 1970")
      ).toBe(true);

      expect(cookieHeader.includes("refreshToken=;")).toBeDefined();
    });
  });
});
