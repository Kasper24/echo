import express, { type Express } from "express";
import morgan from "morgan";
import cors from "cors";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import { NotFoundError } from "@repo/backend/utils/errors";
import rootRouter from "@repo/backend/modules";
import errorHandler from "@repo/backend/middlewares/error";

export const createServer = (): Express => {
  const app = express();
  app
    .disable("x-powered-by")
    .use(morgan("dev"))
    .use(express.urlencoded({ extended: true }))
    .use(express.json())
    .use(cookieParser())
    .use(cors())
    .use(
      rateLimit({
        windowMs: process.env.WINDOW_SIZE_IN_MINUTES * 60 * 1000,
        max: process.env.MAX_NUMBER_OF_REQUESTS_PER_WINDOW_SIZE,
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
