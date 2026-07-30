import dotenv from 'dotenv';
import path from 'node:path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const numberFromEnv = (name: string, fallback: number): number => {
    const value = Number(process.env[name]);
    return Number.isFinite(value) && value >= 0 ? value : fallback;
};

const listFromEnv = (name: string, fallback: string[]): string[] => {
    const value = process.env[name];
    return value
        ? value
              .split(',')
              .map((item) => item.trim())
              .filter(Boolean)
        : fallback;
};

export const config = {
    env: process.env.NODE_ENV ?? 'development',
    port: numberFromEnv('PORT', 4444),
    databaseUrl:
        process.env.DATABASE_URL ??
        'postgresql://mailing:mailing@localhost:5432/mailing?schema=public',
    apiKey: process.env.API_KEY?.trim() || undefined,
    corsOrigins: listFromEnv('CORS_ORIGINS', ['http://localhost:3000', 'http://localhost:4444']),
    telegram: {
        mode: process.env.TELEGRAM_MODE === 'live' ? 'live' : 'mock',
        token: process.env.TELEGRAM_BOT_TOKEN?.trim() || undefined,
        apiUrl: process.env.TELEGRAM_API_URL ?? 'https://api.telegram.org',
    },
    queue: {
        delayMs: numberFromEnv('QUEUE_DELAY_MS', 750),
        maxRetries: Math.max(1, numberFromEnv('QUEUE_MAX_RETRIES', 3)),
        retryDelayMs: numberFromEnv('QUEUE_RETRY_DELAY_MS', 1000),
    },
} as const;

if (config.telegram.mode === 'live' && !config.telegram.token) {
    throw new Error('TELEGRAM_BOT_TOKEN обязателен при TELEGRAM_MODE=live');
}
