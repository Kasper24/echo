import { execSync } from "node:child_process";

const dbPush = async () => {
  execSync("npm run db:push -w @repo/database", {
    env: process.env,
    stdio: "inherit",
  });
};

export { dbPush };
