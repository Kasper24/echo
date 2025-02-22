import { Request, Response, NextFunction } from "express";
import { AuthError } from "@repo/backend/utils/errors";
import { jwtVerifyAccessToken } from "@repo/backend/utils/jwt";
import { User, users } from "@repo/backend/database/schema";
import { db } from "@repo/backend/database";
import { eq } from "drizzle-orm";

export interface AuthenticatedRequest extends Request {
  user: User;
}

const authHandler = async (req: Request, res: Response, next: NextFunction) => {
  const { authorization } = req.headers;
  if (!authorization) throw new AuthError("Authorization header not found.");

  const token = authorization.split(" ")[1];
  if (!token) throw new AuthError("No token provided.");

  try {
    const { userId } = jwtVerifyAccessToken(token);
    if (!userId) throw new AuthError("Invalid token.");

    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });
    if (!user) throw new AuthError("Invalid token.");

    (req as AuthenticatedRequest).user = user;
  } catch (error: unknown) {
    if (error instanceof Error) throw new AuthError(error.message);
    else throw new AuthError("Invalid token");
  }

  next();
};

export default authHandler;
