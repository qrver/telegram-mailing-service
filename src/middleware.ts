import type { NextFunction, Request, Response } from 'express';
import { config } from './config.js';
import { AppError } from './errors.js';

export const apiKey = (request: Request, _response: Response, next: NextFunction): void => {
    if (!config.apiKey) return next();
    const header =
        request.header('x-api-key') ?? request.header('authorization')?.replace(/^Bearer\s+/i, '');
    if (header !== config.apiKey) return next(new AppError('Неверный API-ключ', 401));
    next();
};

export const asyncHandler =
    (handler: (request: Request, response: Response, next: NextFunction) => Promise<void>) =>
    (request: Request, response: Response, next: NextFunction): void => {
        void handler(request, response, next).catch(next);
    };
