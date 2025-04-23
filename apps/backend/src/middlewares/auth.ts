import { Request, Response, NextFunction } from "express";
import { AuthError } from "@repo/backend/errors";
import { jwtVerifyAccessToken } from "@repo/backend/utils/jwt";
import { attempt } from "@repo/backend/utils";

export interface AuthenticatedRequest extends Request {
  userId: number;
}

const authHandler = async (req: Request, res: Response, next: NextFunction) => {
  // const { authorization } = req.headers;
  // if (!authorization) throw new AuthError("Authorization header not found.");

  // const token = authorization.split(" ")[1];
  // if (!token) throw new AuthError("No token provided.");

  const token = req.cookies[process.env.JWT_ACCESS_TOKEN_COOKIE_KEY];

  const [error, data] = await attempt(() => jwtVerifyAccessToken(token));
  if (error) throw new AuthError(error.message);

  (req as AuthenticatedRequest).userId = data.userId;

  next();
};

export default authHandler;
