import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

const db = drizzle({
  schema: schema,
  connection: {
    host: process.env.POSTGRES_HOST,
    port: process.env.POSTGRES_PORT,
    database: process.env.POSTGRES_DATABASE,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    ssl: true,
  },
});

const dbTestConnection = async () => {
  try {
    const result = await db.execute("SELECT NOW()");
    console.log("✅ PostgreSQL connected:", result.rows[0].now);
  } catch (err) {
    console.error("❌ PostgreSQL connection error:", err);
  }
};

export { db, dbTestConnection };
