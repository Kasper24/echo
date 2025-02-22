import { createServer } from "@repo/backend/server";
import { redisConnect } from "@repo/backend/database/redis";
import envValidate from "@repo/backend/config";
import { dbTestConnection } from "./database";

await envValidate();
await dbTestConnection();
await redisConnect();

const server = createServer();
server.listen(process.env.PORT, () => {
  console.log(`api running on ${process.env.PORT}`);
});
