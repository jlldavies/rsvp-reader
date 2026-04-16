import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { parseRouter } from './routes/parse.js';
import { summarizeRouter } from './routes/summarize.js';

// Summarise endpoint: 10 requests per IP per 15 minutes (protects API key spend)
const summarizeLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  message: { error: 'Too many summarise requests. Please wait a few minutes.' },
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

// General API: 200 req/min per IP
const apiLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 200,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

export function createApp() {
  const app = express();

  // Security headers (removes X-Powered-By, sets CSP, etc.)
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));

  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  app.use('/api', apiLimit, parseRouter);
  app.use('/api/summarize', summarizeLimit);
  app.use('/api', summarizeRouter);

  return app;
}
