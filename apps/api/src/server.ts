import express, { type Express } from "express";
import morgan from "morgan";
import multer from "multer";
import cors from "cors";
import cookieParser from "cookie-parser";
import rootRouter from "@repo/api/modules";
import errorHandler from "@repo/api/middlewares/error";
import rateLimitMiddleware from "@repo/api/middlewares/rate-limit";

export const createServer = (): Express => {
  const app = express();
  app
    .disable("x-powered-by")
    .use(
      morgan(
        `:remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length]`,
        { immediate: true }
      )
    )
    .use(express.urlencoded({ extended: true }))
    .use(express.json())
    .use(
      multer({
        storage: multer.memoryStorage(), // Store files in memory
        limits: {
          fileSize: 10 * 1024 * 1024, // 10MB limit
        },
      }).any()
    )
    .use(cookieParser())
    .use(cors({ origin: "http://localhost:3002", credentials: true }))
    // .use(
    //   rateLimitMiddleware({
    //     timeSpan: process.env.WINDOW_SIZE_IN_MINUTES,
    //     limit: process.env.MAX_NUMBER_OF_REQUESTS_PER_WINDOW_SIZE,
    //   })
    // )
    .use("/api/v1", rootRouter.router)
    .all("/*splat", () => {
      throw new Error("You look a little lost.");
    })
    .use(errorHandler);

  return app;
};
