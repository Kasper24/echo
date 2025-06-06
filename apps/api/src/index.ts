import { createServer } from "@repo/api/server";
import envValidate from "@repo/api/env";
import { dbPush, dbReset, dbSeed, dbWaitForConnection } from "@repo/database";

envValidate();
await dbWaitForConnection();

if (process.env.NODE_ENV === "development" && process.env.RESET_DB === "true") {
  await dbPush();
  await dbReset();
  await dbSeed();
}

const server = createServer();
server.listen(process.env.PORT, () => {
  console.log(`api running on ${process.env.PORT}`);
});
