import { jest, beforeEach, afterEach } from "@jest/globals";
// import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { sql } from "drizzle-orm";
import * as schema from "@repo/database/schema";
import { db } from "@repo/database";
import { applyMigrations } from "@repo/database/migrate";
import { pushSchema } from "drizzle-kit/api";

jest.mock("@repo/database", () => {
  const originalModule =
    jest.requireActual<typeof import("@repo/database")>("@repo/database");

  //   const client = new PGlite();
  //   const db = drizzle(client, { schema });
  const db = drizzle({ schema });

  return {
    ...originalModule,
    __esModule: true,
    db,
  };
});

// Apply migrations before each test
beforeEach(async () => {
  const { apply } = await pushSchema(schema, db as any);
  apply();
  // await applyMigrations();
});

// Clean up the database after each test
afterEach(async () => {
  await db.execute(sql`drop schema if exists public cascade`);
  await db.execute(sql`create schema public`);
  await db.execute(sql`drop schema if exists drizzle cascade`);
});
