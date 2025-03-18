import { Request, Response, NextFunction } from "express";
import redis from "@repo/backend/redis";
import { parseTimeSpan, type TimeSpan } from "@repo/backend/utils/time";
import { RateLimitError } from "@repo/backend/errors";

const rateLimitHandler = ({
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
  return async (request: Request, response: Response, next: NextFunction) => {
    const { ip } = request;
    const redisId = `rate-limit:${endpoint}/${ip}`;

    const requests = await redis.incr(redisId);
    if (requests === 1) await redis.expire(redisId, parseTimeSpan(timeSpan));

    limit = process.env.NODE_ENV === "development" ? Infinity : limit;
    if (requests > limit) {
      next(
        new RateLimitError(
          message ?? "Too many requests, please try again later",
        ),
      );
      return;
    }

    next();
  };
};

export default rateLimitHandler;
