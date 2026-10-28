import { Queue } from "bullmq";
import { Redis } from "ioredis";

export const connection = new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null,
});

export const INDEX_QUEUE = "index-repo";

export const indexQueue = new Queue(INDEX_QUEUE, { connection });