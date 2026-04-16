import express from 'express';
import cors from 'cors';
import { parseRouter } from './routes/parse.js';
import { summarizeRouter } from './routes/summarize.js';

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  app.use('/api', parseRouter);
  app.use('/api', summarizeRouter);

  return app;
}
