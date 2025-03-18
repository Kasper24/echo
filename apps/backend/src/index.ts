import { createServer } from "@repo/backend/server";
import envValidate from "@repo/backend/config";
import { dbTestConnection } from "@repo/database";

await envValidate();
await dbTestConnection();

const server = createServer();
server.listen(process.env.PORT, () => {
  console.log(`api running on ${process.env.PORT}`);
});
