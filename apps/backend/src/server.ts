import express, { type Express } from "express";
import morgan from "morgan";
import cors from "cors";
import cookieParser from "cookie-parser";
import { NotFoundError } from "@repo/backend/utils/errors";
import rootRouter from "@repo/backend/modules";
import errorHandler from "@repo/backend/middlewares/error";
import rateLimitHandler from "@repo/backend/middlewares/rate-limit";

export const createServer = (): Express => {
  const app = express();
  app
    .disable("x-powered-by")
    .use(
      morgan(
        `:remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length]`,
        { immediate: true },
      ),
    )
    .use(express.urlencoded({ extended: true }))
    .use(express.json())
    .use(cookieParser())
    .use(cors({ origin: "http://localhost:3002", credentials: true }))
    .use(
      rateLimitHandler({
        timeSpan: process.env.WINDOW_SIZE_IN_MINUTES,
        limit: process.env.MAX_NUMBER_OF_REQUESTS_PER_WINDOW_SIZE,
      }),
    )
    .get("/healthcheck", (_req, res) => {
      res.json({
        message: "Server is running",
        uptime: process.uptime(),
        timestamp: Date.now(),
      });
    })
    .use("/api/v1", rootRouter)
    .all("/*splat", () => {
      throw new NotFoundError("You look a little lost.");
    })
    .use(errorHandler);

  return app;
};
