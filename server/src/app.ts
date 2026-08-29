import express, { Application, Request, Response } from 'express';
import { prisma } from './infrastructure/prisma/client';

const app: Application = express();

app.use(express.json());

// Root endpoint
app.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Query Advisor API',
    version: '1.0.0',
    status: 'online',
  });
});

// Basic server health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Database connectivity health check
app.get('/health/database', async (_req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: 'ok',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Database query failed',
      timestamp: new Date().toISOString(),
    });
  }
});

export default app;
