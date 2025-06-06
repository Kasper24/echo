import { NextFunction } from "express";
import { drizzle } from "drizzle-orm/pglite";
import { jest, afterEach, beforeAll, afterAll } from "@jest/globals";
import * as schema from "@repo/database/schema";
import { db, dbPush, dbReset } from "@repo/database";
import redis from "@repo/backend/redis";

jest.mock("@repo/database", () => {
  const originalModule =
    jest.requireActual<typeof import("@repo/database")>("@repo/database");

  const db = drizzle({ schema });

  return {
    ...originalModule,
    __esModule: true,
    db,
  };
});

jest.mock("@repo/backend/middlewares/rate-limit", () => {
  const originalModule = jest.requireActual<
    typeof import("@repo/backend/middlewares/rate-limit")
  >("@repo/backend/middlewares/rate-limit");

  const rateLimitMiddleware = jest
    .fn()
    .mockReturnValue((_: Request, __: Response, next: NextFunction) => {
      next();
    });

  return {
    ...originalModule,
    __esModule: true,
    rateLimitMiddleware,
  };
});

beforeAll(async () => {
  await dbPush(db);
});

afterEach(async () => {
  await dbReset(db);
});

afterAll(async () => {
  redis.quit();
});
