require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const app = express();

// CẢI THIỆN: Cấu hình CORS chi tiết hơn
const corsOptions = {
  origin: function (origin, callback) {
    // Cho phép các origins sau:
    const allowedOrigins = [
      'http://localhost:5173',
      'https://todo-ivf9m1068-cuongs-projects-f0396875.vercel.app',
      'https://todo-app-frontend.vercel.app',
      'https://todo-app-seven-ashy.vercel.app'
    ];
    
    // Cho phép cả requests không có origin (Postman, mobile apps, etc.)
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200,
  maxAge: 86400
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.header('Access-Control-Allow-Credentials', 'true');  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});
// Security Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors(corsOptions));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    message: "Too many requests from this IP, please try again later."
  }
});
app.use("/api/", limiter);

// Body Parser
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Routes
const authRoutes = require("./routes/authRoutes");
const taskRoutes = require("./routes/taskRoutes");
const projectRoutes = require("./routes/projectRoutes"); 
const advancedTaskRoutes = require("./routes/advancedTaskRoutes");
const pushRoutes = require("./routes/pushRoutes");
const goalRoutes = require("./routes/goalRoutes");

app.use("/api/auth", authRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/push", pushRoutes);
app.use("/api/advanced-tasks", advancedTaskRoutes);
app.use("/api/goals", goalRoutes);

// Health Check
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("Error:", err);

  // Log detailed error
  console.error("Error details:", {
    name: err.name,
    message: err.message,
    stack: err.stack,
    code: err.code,
    statusCode: err.statusCode
  });

  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error",
    ...(process.env.NODE_ENV === "development" && { 
      stack: err.stack,
      details: {
        name: err.name,
        code: err.code
      }
    }),
  });
});

// ✅ FIX: Sử dụng đúng tên biến và loại bỏ deprecated options
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI is not defined in .env file");
  process.exit(1);
}

console.log("🔗 Connecting to MongoDB...");
const maskedURI = MONGODB_URI ? '***' : 'not set';
console.log("📍 URI configured:", !!MONGODB_URI);
console.log("🌍 Environment:", process.env.NODE_ENV || "development");

mongoose
  .connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  })
  .then(() => {
    console.log("✅ MongoDB connected successfully");
    
    // Kiểm tra connection
    const db = mongoose.connection;
    
    db.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });
    
    db.on('disconnected', () => {
      console.warn('⚠️ MongoDB disconnected');
    });
    
    // Start server chỉ sau khi MongoDB connected
    const PORT = process.env.PORT || 5000;
    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📝 Environment: ${process.env.NODE_ENV || "development"}`);
      console.log(`🌐 API URL: http://localhost:${PORT}`);
      console.log(`🌍 CORS enabled for multiple origins`);
      
      // Test server health
      console.log(`✅ Health check: http://localhost:${PORT}/health`);
    });
    
    // Đợi kết nối ổn định trước khi truy cập db
    setTimeout(() => {
      console.log("📦 Database:", db.db?.databaseName || "Unknown");
    }, 1000);

    // Start cron job
    require("./cron/sendDueNotifications")();
    
    // Graceful shutdown
    process.on("SIGTERM", () => {
      console.log("SIGTERM signal received: closing HTTP server");
      server.close(() => {
        console.log("HTTP server closed");
        mongoose.connection.close(false, () => {
          console.log("MongoDB connection closed");
          process.exit(0);
        });
      });
    });
    
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);
    console.error("💡 Check your MONGODB_URI in .env file");
    console.error("🔍 Error details:", err);
    process.exit(1);
  });

module.exports = app;