import { reset } from "drizzle-seed";
import { db } from "..";
import * as schema from "../schema";

const dbReset = async () => {
  await reset(db, schema);
};

export { dbReset };
