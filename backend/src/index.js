const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const jwt = require("jsonwebtoken");

const redis = require("./config/redis");
const adminRoutes = require("./routes/adminRoutes");
const authRoutes = require("./routes/authRoutes");
const tripRoutes = require("./routes/tripRoutes");
const exploreRoutes = require("./routes/exploreRoutes");
const authMiddleware = require("./middlewares/authMiddleware");

dotenv.config();

const app = express();
const server = http.createServer(app);

// --- Middleware ---
app.use(cors({ origin: "*", credentials: true }));
app.use(express.json());

// --- MongoDB Connection ---
const mongoUri = process.env.MONGO_URI;
if (!mongoUri) {
  console.error("MONGO_URI missing in .env");
  process.exit(1);
}

mongoose
  .connect(mongoUri)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  });

// --- Socket.IO Setup ---
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

io.on("connection", (socket) => {
  console.log("✅ Socket connected:", socket.id);

  // Handle JWT from handshake
  const token = socket.handshake.auth?.token;
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = { id: decoded.id, email: decoded.email };
      console.log("🔐 Socket authenticated for user:", socket.user.id);
    } catch (err) {
      console.warn("⚠️ Invalid token:", err.message);
    }
  }

  // Join a trip room
  socket.on("joinTrip", ({ tripId, userId }) => {
    const uid = socket.user?.id || userId;
    if (!tripId) return;
    socket.join(tripId);
    console.log(`🚗 User ${uid || "anon"} joined trip room: ${tripId}`);
  });

  // Receive and broadcast location
  socket.on("sendLocation", async ({ tripId, userId, location }) => {
    try {
      const uid = socket.user?.id || userId;
      if (!tripId || !uid || !location) return;

      const payload = {
        userId: uid,
        location: {
          lat: location.lat,
          lng: location.lng,
          ts: Date.now(),
        },
      };

      // Emit to all clients in the room
      io.to(tripId).emit("locationUpdate", payload);

      // Save to Redis
      const key = `trip:${tripId}:locations`;
      await redis.hset(key, uid, JSON.stringify(payload.location));

      // Optional: expire after 24h
      // await redis.expire(key, 86400);
    } catch (err) {
      console.error("❌ sendLocation error:", err.message);
    }
  });

  socket.on("disconnect", (reason) => {
    console.log("🔌 Socket disconnected:", socket.id, "| Reason:", reason);
  });
});

// --- Health Check Route ---
app.get("/api/health", async (req, res) => {
  let redisOk = true;
  try {
    await redis.ping();
  } catch (err) {
    redisOk = false;
  }

  res.json({
    success: true,
    service: "TripSync",
    mongo: mongoose.connection.readyState === 1 ? "ok" : "down",
    redis: redisOk ? "ok" : "down",
  });
});

// --- API Routes ---
app.use("/api/admin", adminRoutes);
app.use("/api/auth", authRoutes);
app.use("/api", exploreRoutes);
app.use("/api/trips", authMiddleware, tripRoutes);

// --- Start Server ---
const PORT = process.env.PORT || 5000;
server.listen(PORT, () =>
  console.log(`🚀 Server running at http://localhost:${PORT}`)
);

// --- Graceful Shutdown ---
process.on("SIGINT", async () => {
  console.log("\n🛑 Shutting down...");
  await mongoose.disconnect().catch(() => { });
  redis.disconnect();
  server.close(() => process.exit(0));
});
