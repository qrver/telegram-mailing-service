import cors from 'cors';
import express, { type ErrorRequestHandler } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { ZodError } from 'zod';
import { apiRouter } from './api.js';
import { config } from './config.js';
import { AppError } from './errors.js';
import { apiKey } from './middleware.js';
import { openApiDocument } from './openapi.js';
import { prisma } from './infrastructure/prisma.js';
import { telegramProvider } from './services/telegramProvider.js';
import { logger } from './logger.js';

export const app = express();

app.use(helmet());
app.use(cors({ origin: config.corsOrigins, credentials: false }));
app.use(express.json({ limit: '1mb' }));
app.use(
    rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: 'draft-8', legacyHeaders: false }),
);
app.get('/health', async (_request, response) => {
    let database = false;
    let telegram = false;
    try {
        await prisma.$queryRaw`SELECT 1`;
        database = true;
    } catch (error) {
        logger.error('database health check failed', error);
    }
    try {
        telegram = await telegramProvider.healthCheck();
    } catch (error) {
        logger.error('Telegram health check failed', error);
    }
    const healthy = database && telegram;
    response
        .status(healthy ? 200 : 503)
        .json({ status: healthy ? 'ok' : 'error', checks: { database, telegram } });
});

app.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiDocument));
app.get('/docs.json', (_request, response) => response.json(openApiDocument));
app.use('/api', apiKey, apiRouter);
app.use((_request, _response, next) => next(new AppError('Маршрут не найден', 404)));

const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
    if (error instanceof ZodError) {
        response.status(400).json({ error: 'Ошибка валидации', details: error.issues });
        return;
    }
    if (error instanceof AppError) {
        response.status(error.statusCode).json({ error: error.message, details: error.details });
        return;
    }
    logger.error('Unhandled request error', error);
    response.status(500).json({ error: 'Внутренняя ошибка сервера' });
};

app.use(errorHandler);
