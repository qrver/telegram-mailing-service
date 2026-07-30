export class AppError extends Error {
    constructor(
        message: string,
        public readonly statusCode = 500,
        public readonly details?: unknown,
    ) {
        super(message);
        this.name = 'AppError';
    }
}

export class TelegramApiError extends Error {
    constructor(
        message: string,
        public readonly errorCode?: number,
    ) {
        super(message);
        this.name = 'TelegramApiError';
    }
}
