const format = (message: string, meta?: Record<string, unknown>): string =>
    meta ? `${message} ${JSON.stringify(meta)}` : message;

export const logger = {
    info(message: string, meta?: Record<string, unknown>): void {
        console.log(`[info] ${format(message, meta)}`);
    },
    warn(message: string, meta?: Record<string, unknown>): void {
        console.warn(`[warn] ${format(message, meta)}`);
    },
    error(message: string, error?: unknown, meta?: Record<string, unknown>): void {
        const errorMessage = error instanceof Error ? error.message : error;
        console.error(`[error] ${format(message, { ...meta, error: errorMessage })}`);
    },
};
