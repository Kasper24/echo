import { Request } from "express";
import { jwtVerifyAccessToken } from "@repo/api/utils/jwt";
import { attempt } from "@repo/api/utils";
import { RouteHandlerContext } from "@repo/typiserver";

export interface AuthenticatedRequest extends Request {
  userId: number;
}

const authMiddleware = async (ctx: RouteHandlerContext) => {
  // const { authorization } = req.headers;
  // if (!authorization) return ctx.error("UNAUTHORIZED", Authorization header not found.");

  // const token = authorization.split(" ")[1];
  // if (!token) return ctx.error("UNAUTHORIZED", "No token provided.");

  const token = ctx.request.cookies[process.env.JWT_ACCESS_TOKEN_COOKIE_KEY];

  const [error, data] = await attempt(() => jwtVerifyAccessToken(token));
  if (error) return ctx.error("UNAUTHORIZED", error.message);

  return ctx.success({
    userId: data.userId,
  });
};

export default authMiddleware;
