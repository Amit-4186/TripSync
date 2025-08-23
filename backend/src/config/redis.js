require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const Redis = require("ioredis");
const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";
const redis = new Redis(redisUrl);
redis.on("connect", () => console.log("Redis (config) connected"));
redis.on("error", (e) => console.error("Redis (config) error:", e.message));
module.exports = redis;
