import { Redis } from "ioredis";

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  username: process.env.REDIS_USER,
  password: process.env.REDIS_PASSWORD,
});

export default redis;
