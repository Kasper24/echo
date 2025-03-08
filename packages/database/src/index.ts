import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

const pool = new Pool({
  host: process.env.POSTGRES_HOST,
  port: Number(process.env.POSTGRES_PORT!),
  database: process.env.POSTGRES_DATABASE,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  ssl: true,
});

const db = drizzle(pool, { schema });

const dbTestConnection = async () => {
  try {
    const result = await db.execute("SELECT NOW()");
    console.log("✅ PostgreSQL connected:", result.rows[0].now);
  } catch (err) {
    console.error("❌ PostgreSQL connection error:", err);
  }
};

export { db, dbTestConnection };
