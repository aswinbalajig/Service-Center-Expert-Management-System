import { createClient } from "redis";
import { setTimeout } from "node:timers/promises"; // Modern, promise-based timer

class RedisManager {
  static instance = null;

  constructor() {
    if (RedisManager.instance) {
      return RedisManager.instance;
    }

    this.client = createClient({
      url: process.env.REDIS_URL || "redis://localhost:6379",
    });

    this.client.on("error", (err) => console.error("Redis Client Error:", err));

    RedisManager.instance = this;
  }

  static getInstance() {
    if (!RedisManager.instance) {
      RedisManager.instance = new RedisManager();
    }
    return RedisManager.instance;
  }

  async connect() {
    if (!this.client.isOpen) {
      await this.client.connect();
    }
    return this.client;
  }

  async get(key) {
    const client = await this.connect();
    return await client.get(key);
  }

  async set(key, value, expirationInSeconds = null) {
    const client = await this.connect();
    const options = expirationInSeconds ? { EX: expirationInSeconds } : {};
    return await client.set(key, value, options);
  }

  async getHash(key) {
    const client = await this.connect();
    const data = await client.hGetAll(key);
    return Object.keys(data).length ? data : null;
  }

  async setHash(key, value, expirationInSeconds = null) {
    const client = await this.connect();
    await client.hSet(key, value);

    if (expirationInSeconds) {
      await client.expire(key, expirationInSeconds);
    }

    return true;
  }

  async deleteKey(key) {
    const client = await this.connect();
    await client.del(key);
    return true;
  }

  async executeTransaction(commands) {
    const client = await this.connect();
    const multi = client.multi();

    commands.forEach((cmd) => {
      multi[cmd.action](...cmd.args);
    });

    return await multi.exec();
  }

  async executeWithRetry(watchKey, transactionLogic) {
    const client = await this.connect();

    return await retry(
      async (bail, attempt) => {
        await client.watch(watchKey);

        try {
          const multi = await transactionLogic(client);
          const results = await multi.exec();

          if (results === null) {
            console.warn(
              `Conflict on ${watchKey}. Retry attempt ${attempt}...`,
            );
            throw new Error("Transaction aborted by Redis");
          }

          return results;
        } catch (error) {
          await client.unwatch();

          if (error.message === "Item is out of stock!") {
            bail(error);
            return;
          }

          throw error;
        }
      },
      {
        retries: 5, // Maximum number of attempts
        factor: 2, // The exponential multiplier
        minTimeout: 50, // Base delay in ms
        randomize: true, // This boolean automatically adds the Jitter
      },
    );
  }
}

export default RedisManager.getInstance();
