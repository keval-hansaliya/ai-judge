import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './src/config/env.js';
import { prisma, pool } from './src/config/db.js';
import { ApiResponse } from './src/utils/ApiResponse.js';
import authRouter from './src/routes/auth.routes.js';
import battleRouter from './src/routes/battle.routes.js';
import leaderboardRouter from './src/routes/leaderboard.routes.js';
import evaluationRouter from './src/routes/evaluation.routes.js';
import { errorHandler } from './src/middlewares/errorHandler.js';

const app = express();

// 1. Production Security Headers with Helmet
// Allow cross-origin SSE and inline styling/fonts
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false // Handled or configured per frontend deployment
}));

// 2. Production CORS Configuration
const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests (curl, server-to-server, postman) or matching allowed origins
    if (!origin || env.ALLOWED_ORIGINS.includes(origin) || env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));

// 3. Body Parsers with Safe Limits
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// 4. Rate Limiting for API Protection
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: env.NODE_ENV === 'production' ? 600 : 3000, // requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    statusCode: 429,
    success: false,
    message: "Too many requests from this IP, please try again after 15 minutes."
  }
});
app.use('/api/', globalLimiter);

// Specific stricter limit for auth routes to prevent brute-force attacks
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.NODE_ENV === 'production' ? 100 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    statusCode: 429,
    success: false,
    message: "Too many authentication attempts, please try again after 15 minutes."
  }
});
app.use('/api/v1/auth', authLimiter);

// 5. Health Check & Diagnostics Endpoint
app.get('/health', async (req, res) => {
  let dbStatus = "connected";
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (err) {
    dbStatus = `disconnected: ${err.message}`;
  }

  const activeProviders = [];
  if (env.OPENROUTER_API_KEY) activeProviders.push('openrouter');
  if (env.GROQ_API_KEY) activeProviders.push('groq');
  if (env.GEMINI_API_KEY) activeProviders.push('gemini');

  res.status(dbStatus === "connected" ? 200 : 503).json(
    new ApiResponse(
      dbStatus === "connected" ? 200 : 503,
      {
        status: dbStatus === "connected" ? "healthy" : "unhealthy",
        uptimeSeconds: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
        environment: env.NODE_ENV,
        database: dbStatus,
        configuredProviders: activeProviders
      },
      dbStatus === "connected" ? "Service is healthy" : "Service degraded"
    )
  );
});

// Root welcome endpoint
app.get('/', (req, res) => {
  res.status(200).json(
    new ApiResponse(200, null, "LM Arena — AI Judge API is up and running")
  );
});

// 6. Application Routes
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/battles', battleRouter);
app.use('/api/v1/leaderboard', leaderboardRouter);
app.use('/api/v1/evaluations', evaluationRouter);

// 7. Centralized Error Handler (must be registered last)
app.use(errorHandler);

// 8. Server Startup & Graceful Shutdown
const PORT = env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`\n🚀 LM Arena Backend listening on port ${PORT} [${env.NODE_ENV} mode]`);
  console.log(`   Health check available at http://localhost:${PORT}/health\n`);
});

// Graceful shutdown on termination signals
const shutdown = async (signal) => {
  console.log(`\n[${signal}] Initiating graceful shutdown...`);
  server.close(async () => {
    console.log("   Closed HTTP connection pool.");
    try {
      await prisma.$disconnect();
      await pool.end();
      console.log("   Disconnected from PostgreSQL database.");
    } catch (e) {
      console.error("   Error during database pool disconnect:", e.message);
    }
    process.exit(0);
  });

  // Force close after 10s if connections hang
  setTimeout(() => {
    console.error("   Forced shutdown due to timeout.");
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));