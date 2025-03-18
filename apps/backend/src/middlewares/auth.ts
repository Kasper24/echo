import { Request, Response, NextFunction } from "express";
import { AuthError } from "@repo/backend/errors";
import { jwtVerifyAccessToken } from "@repo/backend/utils/jwt";

export interface AuthenticatedRequest extends Request {
  userId: number;
}

const authHandler = async (req: Request, res: Response, next: NextFunction) => {
  const { authorization } = req.headers;
  if (!authorization) throw new AuthError("Authorization header not found.");

  const token = authorization.split(" ")[1];
  if (!token) throw new AuthError("No token provided.");

  try {
    const { userId } = jwtVerifyAccessToken(token);
    if (!userId) throw new AuthError("Invalid token.");

    (req as AuthenticatedRequest).userId = userId;
  } catch (error: unknown) {
    if (error instanceof Error) throw new AuthError(error.message);
    else throw new AuthError("Invalid token.");
  }

  next();
};

export default authHandler;
