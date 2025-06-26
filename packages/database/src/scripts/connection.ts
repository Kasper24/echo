import { db } from "..";

const dbWaitForConnection = async (maxRetries = 5, delayMs = 2000) => {
  let retries = 0;

  while (true) {
    try {
      const result = await db.execute("SELECT NOW()");
      console.log("✅ PostgreSQL connected:", result.rows[0].now);
      return;
    } catch (err) {
      retries++;
      console.error(
        `❌ PostgreSQL connection error (attempt ${retries}):`,
        err,
      );

      if (retries >= maxRetries) {
        console.error("❌ Max retries reached. Exiting...");
        process.exit(1);
      }

      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
};

export { dbWaitForConnection };
