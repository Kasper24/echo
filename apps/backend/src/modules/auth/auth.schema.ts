import { z } from "zod";

const sendOtpSchema = z.object({
  body: z.object({
    phoneNumber: z.string().min(10).max(15),
  }),
});

const statusOtpSchema = z.object({
  body: z.object({
    phoneNumber: z.string().min(10).max(15),
  }),
});

const verifyOtpSchema = sendOtpSchema.extend({
  body: z.object({
    otp: z.string().min(6).max(6),
  }),
});

const refreshTokenSchema = z.object({
  cookies: z.object({
    refreshToken: z.string().min(1),
  }),
});

export { sendOtpSchema, statusOtpSchema, verifyOtpSchema, refreshTokenSchema };
