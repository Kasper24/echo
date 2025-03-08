import jwt from "jsonwebtoken";
import { TokenPayload } from "@repo/backend/modules/auth/auth.types";

const jwtSignAccessToken = (payload: TokenPayload) => {
  return jwt.sign(payload, process.env.JWT_ACCESS_TOKEN_SECRET, {
    expiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRY,
  });
};

const jwtSignRefreshToken = (payload: TokenPayload) => {
  return jwt.sign(payload, process.env.JWT_REFRESH_TOKEN_SECRET, {
    expiresIn: process.env.JWT_REFRESH_TOKEN_EXPIRY,
  });
};

const jwtVerifyAccessToken = (token: string) => {
  return jwt.verify(token, process.env.JWT_ACCESS_TOKEN_SECRET) as TokenPayload;
};

const jwtVerifyRefreshToken = (token: string) => {
  return jwt.verify(token, process.env.JWT_ACCESS_TOKEN_SECRET) as TokenPayload;
};

export {
  jwtSignAccessToken,
  jwtSignRefreshToken,
  jwtVerifyAccessToken,
  jwtVerifyRefreshToken,
};
