import express from "express";
import cors from "cors";
import { loadEnv } from "./config/environment";
import { STATE_CLEANUP_INTERVAL_MS } from "./config/constants";
import {
  createSessionMiddleware,
  closeRedis,
} from "./middleware/session.middleware";
import { csrfProtection } from "./middleware/csrf.middleware";
import { rateLimiter } from "./middleware/rate-limit.middleware";
import { closePool, query } from "./database/client";
import { logger, setLogLevel } from "./utils/logger";
import { AppError } from "./utils/errors";

// Routes
import healthRoutes from "./routes/health.routes";
import authRoutes from "./routes/auth.routes";
import notionRoutes from "./routes/notion.routes";

// ─── 1. Validate environment ────────────────────────────────────────
const env = loadEnv();
setLogLevel(env.LOG_LEVEL);

// ─── 2. Create Express app ──────────────────────────────────────────
const app = express();

// Trust first proxy (for secure cookies behind nginx / ALB / Next.js rewrites)
if (env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

// ─── 3. Global middleware (order matters) ────────────────────────────

/**
 * CORS Configuration for Next.js Proxy Architecture:
 *
 * With Next.js rewrites, requests are proxied from Next.js to the backend.
 * The Origin header will be the browser's origin (APP_URL).
 * We need to accept this origin for CORS to work correctly.
 *
 * In production behind a reverse proxy, you may need to adjust this
 * based on your deployment architecture.
 */
const allowedOrigins = [env.APP_URL];

// In development, also allow requests without Origin (e.g., from tools, tests)
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (mobile apps, curl, etc.) in development
    if (!origin && env.NODE_ENV === "development") {
      callback(null, true);
      return;
    }
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn("CORS blocked request from origin", { origin, allowedOrigins });
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true, // Essential for session cookies
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
  exposedHeaders: ["Set-Cookie"],
};

app.use(cors(corsOptions));

// 3b. Body parsers
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// 3c. Session (Redis-backed, httpOnly, secure, sameSite)
app.use(createSessionMiddleware());

// 3d. CSRF — validates Origin/Referer on mutating methods
app.use(csrfProtection);

// 3e. Rate limiting — per-user sliding window via Redis
app.use(rateLimiter);

// 3f. Request logging
app.use((req, _res, next) => {
  logger.debug("→ request", {
    method: req.method,
    path: req.path,
    ip: req.ip,
    hasSession: !!req.session?.userId,
  });
  next();
});

// ─── 4. Development auto-login ──────────────────────────────────────
//
// In dev mode, every request is assigned a test user so you can call
// any endpoint immediately without a real auth system.
//
if (env.NODE_ENV === "development") {
  app.use(async (req, _res, next) => {
    if (!req.session.userId) {
      try {
        const { ensureUser } = await import("./modules/user/user.service");
        const user = await ensureUser("dev@localhost", "Dev User");
        req.session.userId = user.id;
        req.session.userEmail = user.email;
        logger.debug("Dev session bootstrapped", { userId: user.id });
      } catch (err) {
        logger.error("Dev auto-login failed", {
          error: (err as Error).message,
        });
      }
    }
    next();
  });
}

// ─── 5. Mount routes ────────────────────────────────────────────────
app.use(healthRoutes);   // GET /health
app.use(authRoutes);     // POST /auth/login, /auth/register, /auth/logout, /auth/notion/*
app.use(notionRoutes);   // GET /notion/status, POST /notion/query, /notion/disconnect

// ─── 6. 404 catch-all ───────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({
    error: {
      code: "internal_error",
      message: "Route not found",
      retryable: false,
    },
  });
});

// ─── 7. Global error handler ────────────────────────────────────────
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    if (err instanceof AppError) {
      res.status(err.statusCode).json(err.toJSON());
      return;
    }

    logger.error("Unhandled exception", {
      error: err.message,
      stack: env.NODE_ENV !== "production" ? err.stack : undefined,
    });

    res.status(500).json({
      error: {
        code: "internal_error",
        message:
          env.NODE_ENV === "production"
            ? "An unexpected error occurred"
            : err.message,
        retryable: true,
      },
    });
  }
);

// ─── 8. Scheduled job: clean expired OAuth states ───────────────────
let cleanupTimer: NodeJS.Timeout | null = null;

function startStateCleanup(): void {
  cleanupTimer = setInterval(async () => {
    try {
      const result = await query(
        `DELETE FROM oauth_states
         WHERE expires_at < NOW()
            OR (consumed = TRUE AND created_at < NOW() - INTERVAL '1 hour')`
      );
      if (result.rowCount && result.rowCount > 0) {
        logger.info("Cleaned expired OAuth states", { deleted: result.rowCount });
      }
    } catch (err) {
      logger.error("State cleanup failed", { error: (err as Error).message });
    }
  }, STATE_CLEANUP_INTERVAL_MS);

  cleanupTimer.unref(); // don't keep the process alive just for cleanup
}

// ─── 9. Start listening ─────────────────────────────────────────────
const server = app.listen(env.PORT, () => {
  logger.info(`🚀 Server listening on port ${env.PORT}`, {
    env: env.NODE_ENV,
    port: env.PORT,
    appUrl: env.APP_URL,
  });
  startStateCleanup();
});

// ─── 10. Graceful shutdown ──────────────────────────────────────────
async function shutdown(signal: string): Promise<void> {
  logger.info(`${signal} received — shutting down`);

  if (cleanupTimer) clearInterval(cleanupTimer);

  server.close(async () => {
    logger.info("HTTP server closed");
    try {
      await closeRedis();
      await closePool();
    } catch (err) {
      logger.error("Shutdown error", { error: (err as Error).message });
    }
    process.exit(0);
  });

  // Hard kill after 10 s
  setTimeout(() => {
    logger.error("Forced shutdown (timeout)");
    process.exit(1);
  }, 10_000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

export default app;