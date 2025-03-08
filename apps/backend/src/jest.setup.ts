import { jest, afterEach, beforeAll } from "@jest/globals";
import { drizzle } from "drizzle-orm/pglite";
import { pushSchema } from "drizzle-kit/api";
import * as schema from "@repo/database/schema";
import { db } from "@repo/database";

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

beforeAll(async () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { apply } = await pushSchema(schema, db as any);
  await apply();
});

afterEach(async () => {
  console.log("🗑️  Emptying the entire database");

  const tableSchema = db._.schema;
  if (!tableSchema) throw new Error("No table schema found");

  const queries = Object.values(tableSchema).map((table) => {
    // console.log(`🧨 Preparing delete query for table: ${table.dbName}`);
    return table.tsName;
  });
  // console.log(queries);

  queries.forEach(async (query) => {
    const schemaToDelete = schema[query];
    if (!schemaToDelete) throw new Error(`No schema found for ${query}`);
    await db.delete(schemaToDelete);
  });
});
