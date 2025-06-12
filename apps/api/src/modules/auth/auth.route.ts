import argon2 from "argon2";
import crypto from "crypto";
import { eq } from "drizzle-orm";
import { z } from "zod";
import {
  createTypiRouter,
  createTypiRoute,
  createTypiRouteHandler,
} from "@repo/typiserver";
import { attempt } from "@repo/api/utils";
import rateLimitMiddleware from "@repo/api/middlewares/rate-limit";
import { db } from "@repo/database";
import { otps, refreshTokens, users } from "@repo/database/schema";
import {
  jwtSignAccessToken,
  jwtSignRefreshToken,
  jwtVerifyAccessToken,
  jwtVerifyRefreshToken,
} from "@repo/api/utils/jwt";
import authMiddleware from "@repo/api/middlewares/auth";

const authRouter = createTypiRouter({
  "/otp/send": createTypiRoute({
    post: createTypiRouteHandler({
      input: {
        body: z.object({
          phoneNumber: z.string().min(10).max(15),
        }),
      },
      middlewares: [
        rateLimitMiddleware({
          endpoint: "/otp/send",
          timeSpan: "5m",
          limit: 5,
          message:
            "Too many SMS messages have been sent to this number recently",
        }),
      ],
      handler: async (ctx) => {
        const otp = crypto.randomInt(100000, 999999).toString().slice(0, 6);
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

        await db
          .insert(otps)
          .values({
            phoneNumber: ctx.input.body.phoneNumber,
            otp,
            expiresAt,
          })
          .onConflictDoUpdate({
            target: otps.phoneNumber,
            set: { otp, expiresAt, updatedAt: new Date() },
          });

        return ctx.success({
          message: "OTP was sent successfully.",
        });
      },
    }),
  }),
  "/otp/status": createTypiRoute({
    post: createTypiRouteHandler({
      input: {
        body: z.object({
          phoneNumber: z.string().min(10).max(15),
        }),
      },
      handler: async (ctx) => {
        const otp = await db.query.otps.findFirst({
          where: eq(otps.phoneNumber, ctx.input.body.phoneNumber),
        });

        if (!otp || otp.expiresAt < new Date())
          return ctx.error("UNAUTHORIZED", "OTP expired or invalid.");

        return ctx.success({
          message: "OTP status checked successfully.",
        });
      },
    }),
  }),
  "/otp/verify": createTypiRoute({
    post: createTypiRouteHandler({
      input: {
        body: z.object({
          phoneNumber: z.string().min(10).max(15),
          otp: z.string().min(6).max(6),
        }),
      },
      middlewares: [
        rateLimitMiddleware({
          endpoint: "/otp/verify",
          timeSpan: "5m",
          limit: 5,
        }),
      ],
      handler: async (ctx) => {
        const existingOtp = await db.query.otps.findFirst({
          where: eq(otps.phoneNumber, ctx.input.body.phoneNumber),
        });

        if (
          !existingOtp ||
          existingOtp.expiresAt < new Date() ||
          existingOtp.otp !== ctx.input.body.otp
        )
          return ctx.error("UNAUTHORIZED", "OTP expired or invalid.");

        let user = await db.query.users.findFirst({
          where: eq(users.phoneNumber, ctx.input.body.phoneNumber),
        });

        if (!user)
          user = (
            await db
              .insert(users)
              .values({
                phoneNumber: ctx.input.body.phoneNumber,
              })
              .returning()
          )[0];

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

        ctx.response.cookie(
          process.env.JWT_ACCESS_TOKEN_COOKIE_KEY,
          accessToken,
          {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: process.env.JWT_ACCESS_TOKEN_MAX_AGE,
          }
        );
        ctx.response.cookie(
          process.env.JWT_REFRESH_TOKEN_COOKIE_KEY,
          refreshToken,
          {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: process.env.JWT_REFRESH_TOKEN_MAX_AGE,
          }
        );

        await db
          .delete(otps)
          .where(eq(otps.phoneNumber, ctx.input.body.phoneNumber));

        return ctx.success({
          message: "OTP verified successfully.",
        });
      },
    }),
  }),
  "/verify": createTypiRoute({
    get: createTypiRouteHandler({
      input: {
        cookies: z.object({
          accessToken: z.string().min(1),
        }),
      },
      handler: async (ctx) => {
        const [error] = await attempt(() =>
          jwtVerifyAccessToken(ctx.input.cookies.accessToken)
        );
        if (error) return ctx.error("UNAUTHORIZED", error.message);

        return ctx.success({
          message: "Access token is valid.",
        });
      },
    }),
  }),
  "/refresh-token": createTypiRoute({
    post: createTypiRouteHandler({
      input: {
        cookies: z.object({
          refreshToken: z.string().min(1),
        }),
      },
      handler: async (ctx) => {
        const [error, data] = await attempt(() =>
          jwtVerifyRefreshToken(ctx.input.cookies.refreshToken)
        );
        if (error) return ctx.error("UNAUTHORIZED", error.message);

        const user = await db.query.users.findFirst({
          where: eq(users.id, data.userId),
        });
        if (!user) return ctx.error("UNAUTHORIZED", "Invalid refresh token");

        const storedToken = await db.query.refreshTokens.findFirst({
          where: eq(refreshTokens.userId, data.userId),
        });
        if (!storedToken)
          return ctx.error("UNAUTHORIZED", "Invalid refresh token.");

        const isTokenValid = await argon2.verify(
          storedToken.token,
          ctx.input.cookies.refreshToken
        );
        if (!isTokenValid)
          return ctx.error("UNAUTHORIZED", "Invalid refresh token.");

        const accessToken = jwtSignAccessToken({ userId: user.id });

        ctx.response.cookie(
          process.env.JWT_ACCESS_TOKEN_COOKIE_KEY,
          accessToken,
          {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: process.env.JWT_ACCESS_TOKEN_MAX_AGE,
          }
        );

        return ctx.success({
          message: "Access token refreshed successfully.",
        });
      },
    }),
  }),
  "/logout": createTypiRoute({
    post: createTypiRouteHandler({
      input: {
        cookies: z.object({
          refreshToken: z.string().min(1),
        }),
      },
      middlewares: [authMiddleware],
      handler: async (ctx) => {
        await db
          .delete(refreshTokens)
          .where(eq(refreshTokens.userId, ctx.data.userId));

        ctx.response.clearCookie(process.env.JWT_ACCESS_TOKEN_COOKIE_KEY);
        ctx.response.clearCookie(process.env.JWT_REFRESH_TOKEN_COOKIE_KEY);

        return ctx.success({
          message: "Logged out successfully.",
        });
      },
    }),
  }),
});

export default authRouter;
