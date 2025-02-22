import { createClient } from "redis";

const redisClient = createClient({
  username: process.env.REDIS_USER,
  password: process.env.REDIS_PASSWORD,
  socket: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
  },
});

const redisConnect = async () => {
  try {
    await redisClient.connect();
    console.log("✅ Redis connected");
  } catch (err) {
    console.error("❌ Redis connection error:", err);
  }
};

redisClient.on("error", (err) => console.error("Redis Client Error:", err));

export { redisClient, redisConnect };
