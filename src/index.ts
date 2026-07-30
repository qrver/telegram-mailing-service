import { app } from './app.js';
import { config } from './config.js';
import { logger } from './logger.js';
import { prisma } from './infrastructure/prisma.js';
import { mailingQueue } from './services/mailingQueue.js';

const server = app.listen(config.port, () => {
    logger.info(`API запущен на порту ${config.port}`, {
        docs: `http://localhost:${config.port}/docs`,
    });
});

const shutdown = async (signal: string): Promise<void> => {
    logger.info(`Получен ${signal}, завершение работы`);
    server.close(async () => {
        await mailingQueue.shutdown();
        await prisma.$disconnect();
        process.exit(0);
    });
};

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
