import { Router } from 'express';
import { AppError } from './errors.js';
import { asyncHandler } from './middleware.js';
import { mailingQueue } from './services/mailingQueue.js';
import { mailingRepository } from './repositories/mailingRepository.js';
import { parseMailingInput } from './validation.js';
import { serializeMailing } from './serializers.js';

export const apiRouter = Router();

apiRouter.post(
    '/mailings',
    asyncHandler(async (request, response) => {
        const input = parseMailingInput(request.body);
        const mailing = await mailingRepository.create(input);
        response.status(201).json({ data: serializeMailing(mailing) });
    }),
);

apiRouter.get(
    '/mailings',
    asyncHandler(async (_request, response) => {
        const mailings = await mailingRepository.findMany();
        response.json({ data: mailings.map(serializeMailing) });
    }),
);

apiRouter.get(
    '/mailings/:id',
    asyncHandler(async (request, response) => {
        const id = parseId(firstParam(request.params.id));
        const mailing = await mailingRepository.findById(id);
        if (!mailing) throw new AppError('Рассылка не найдена', 404);
        const stats = await mailingRepository.getDeliveryStats(id);
        response.json({ data: { ...serializeMailing(mailing), stats } });
    }),
);

apiRouter.post(
    '/mailings/:id/start',
    asyncHandler(async (request, response) => {
        const result = await mailingQueue.start(parseId(firstParam(request.params.id)));
        response.status(202).json({ data: result });
    }),
);

apiRouter.post(
    '/mailings/:id/cancel',
    asyncHandler(async (request, response) => {
        const id = parseId(firstParam(request.params.id));
        await mailingQueue.cancel(id);
        response.json({ data: { id, status: 'cancelled' } });
    }),
);

apiRouter.post(
    '/mailings/:id/test',
    asyncHandler(async (request, response) => {
        const recipient = String(request.body?.telegramId ?? '');
        if (!/^-?\d+$/.test(recipient))
            throw new AppError('telegramId должен быть целым числом', 400);
        await mailingQueue.test(parseId(firstParam(request.params.id)), recipient);
        response.json({ data: { status: 'sent', telegramId: recipient } });
    }),
);

apiRouter.get('/queue', (_request, response) => {
    response.json({ data: mailingQueue.status() });
});

const parseId = (value: string | undefined): number => {
    const id = Number(value);
    if (!Number.isInteger(id) || id < 1)
        throw new AppError('ID должен быть положительным числом', 400);
    return id;
};

const firstParam = (value: string | string[] | undefined): string | undefined =>
    Array.isArray(value) ? value[0] : value;
