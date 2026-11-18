import redisClient from "../../utils/redis.js";

export async function flushRedis() {
  const client = await redisClient.connect();
  await client.flushDb();
}

export async function closeRedis() {
  if (redisClient.client.isOpen) {
    await redisClient.client.quit();
  }
}

export { redisClient };
