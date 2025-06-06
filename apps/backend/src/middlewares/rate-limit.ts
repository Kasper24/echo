import redis from "@repo/backend/redis";
import { parseTimeSpan, type TimeSpan } from "@repo/backend/utils/time";
import { RouteHandlerContext } from "@repo/typiserver";

const rateLimitMiddleware = ({
  endpoint = "global",
  timeSpan,
  limit,
  message,
}: {
  timeSpan: TimeSpan;
  limit: number;
  endpoint?: string;
  message?: string;
}) => {
  return async (ctx: RouteHandlerContext) => {
    const { ip } = ctx.request;
    const redisId = `rate-limit:${endpoint}/${ip}`;

    const requests = await redis.incr(redisId);
    if (requests === 1) await redis.expire(redisId, parseTimeSpan(timeSpan));

    limit = process.env.NODE_ENV === "development" ? Infinity : limit;
    if (requests > limit) {
      return ctx.error(
        "TOO_MANY_REQUESTS",
        message ?? "Too many requests, please try again later"
      );
    }

    return ctx.success();
  };
};

export default rateLimitMiddleware;
