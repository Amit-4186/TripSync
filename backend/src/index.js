const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const Redis = require("ioredis");
const cors = require("cors");

dotenv.config();

const app = express();
const server = http.createServer(app);

// --- Middlewares ---
app.use(cors());               // allow all for now (dev)
app.use(express.json());       // parse JSON bodies

// --- MongoDB Connection ---
const mongoUri = process.env.MONGO_URI;
if (!mongoUri) {
    console.error("❌ MONGO_URI missing in .env");
    process.exit(1);
}
mongoose
    .connect(mongoUri)
    .then(() => console.log("✅ MongoDB connected"))
    .catch((err) => {
        console.error("❌ MongoDB connection error:", err.message);
        process.exit(1);
    });

// --- Redis Connection ---
const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";
const redis = new Redis(redisUrl);
redis.on("connect", () => console.log("✅ Redis connected"));
redis.on("error", (err) => console.error("❌ Redis error:", err.message));

// --- Socket.io Setup ---
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] },
});

io.on("connection", (socket) => {
    console.log("🟢 Socket connected:", socket.id);

    socket.on("joinTrip", ({ tripId, userId }) => {
        if (!tripId) return;
        socket.join(tripId);
        console.log(`👥 user ${userId || "anon"} joined trip room ${tripId}`);
    });

    socket.on("sendLocation", async ({ tripId, userId, location }) => {
        if (!tripId || !userId || !location) return;
        // broadcast to others in the trip room
        io.to(tripId).emit("locationUpdate", {
            userId,
            location,
            ts: new Date().toISOString(),
        });
        // cache last known location in Redis (hash per trip)
        try {
            await redis.hset(
                `trip:${tripId}:locations`,
                userId,
                JSON.stringify({ ...location, ts: Date.now() })
            );
        } catch (e) {
            console.error("Redis hset error:", e.message);
        }
    });

    socket.on("disconnect", () => {
        console.log("🔴 Socket disconnected:", socket.id);
    });
});

// --- Health route ---
app.get("/api/health", async (req, res) => {
    let redisOk = true;
    try {
        await redis.ping();
    } catch (e) {
        redisOk = false;
    }
    res.json({
        success: true,
        service: "TripSync",
        mongo: mongoose.connection.readyState === 1 ? "ok" : "down",
        redis: redisOk ? "ok" : "down",
    });
});

// --- Start server ---
const PORT = process.env.PORT || 5000;
server.listen(PORT, () =>
    console.log(`🚀 TripSync server running on http://localhost:${PORT}`)
);

// Graceful shutdown
process.on("SIGINT", async () => {
    console.log("\nShutting down...");
    await mongoose.disconnect().catch(() => { });
    redis.disconnect();
    server.close(() => process.exit(0));
});
