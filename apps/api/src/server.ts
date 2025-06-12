import express, { type Express } from "express";
import multer from "multer";
import cors from "cors";
import cookieParser from "cookie-parser";
import rootRouter from "@repo/api/modules";
import errorHandler from "@repo/api/middlewares/error";

export const createServer = (): Express => {
  const app = express();
  app
    .disable("x-powered-by")
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
    .use("/api/v1", rootRouter.router)
    .all("/*splat", () => {
      throw new Error("You look a little lost.");
    })
    .use(errorHandler);

  return app;
};
