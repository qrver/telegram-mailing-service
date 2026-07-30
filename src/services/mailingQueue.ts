import { MailingStatus } from '@prisma/client';
import { config } from '../config.js';
import { AppError, TelegramApiError } from '../errors.js';
import { logger } from '../logger.js';
import { mailingRepository } from '../repositories/mailingRepository.js';
import { createReplyMarkup } from '../utils/replyMarkup.js';
import { telegramProvider } from './telegramProvider.js';
import type { TelegramButton } from '../types.js';

interface ScheduledMailing {
    timer: NodeJS.Timeout;
    target: number;
}

export class MailingQueue {
    private readonly queue: number[] = [];
    private readonly scheduled = new Map<number, ScheduledMailing>();
    private processing: Promise<void> | null = null;

    async start(id: number): Promise<{ status: MailingStatus; sendAt: Date | null }> {
        const mailing = await mailingRepository.findById(id);
        if (!mailing) throw new AppError('Рассылка не найдена', 404);
        if (mailing.status !== MailingStatus.DRAFT && mailing.status !== MailingStatus.FAILED) {
            throw new AppError(`Рассылку нельзя запустить из статуса ${mailing.status}`, 409);
        }

        if (mailing.sendAt && mailing.sendAt.getTime() > Date.now()) {
            await mailingRepository.updateStatus(id, MailingStatus.SCHEDULED, {
                startedAt: new Date(),
            });
            this.schedule(id, mailing.sendAt.getTime());
            return { status: MailingStatus.SCHEDULED, sendAt: mailing.sendAt };
        }

        await mailingRepository.updateStatus(id, MailingStatus.QUEUED, { startedAt: new Date() });
        this.enqueue(id);
        void this.process();
        return { status: MailingStatus.QUEUED, sendAt: null };
    }

    async cancel(id: number): Promise<void> {
        const mailing = await mailingRepository.findById(id);
        if (!mailing) throw new AppError('Рассылка не найдена', 404);
        if (mailing.status !== MailingStatus.SCHEDULED && mailing.status !== MailingStatus.QUEUED) {
            throw new AppError(`Рассылку нельзя отменить из статуса ${mailing.status}`, 409);
        }

        const scheduled = this.scheduled.get(id);
        if (scheduled) {
            clearTimeout(scheduled.timer);
            this.scheduled.delete(id);
        }
        const index = this.queue.indexOf(id);
        if (index !== -1) this.queue.splice(index, 1);
        await mailingRepository.updateStatus(id, MailingStatus.CANCELLED, {
            cancelledAt: new Date(),
        });
    }

    status() {
        return {
            queued: [...this.queue],
            scheduled: [...this.scheduled.entries()].map(([id, item]) => ({
                id,
                sendAt: new Date(item.target).toISOString(),
            })),
            isProcessing: this.processing !== null,
        };
    }

    async test(id: number, telegramId: string): Promise<void> {
        const mailing = await mailingRepository.findById(id);
        if (!mailing) throw new AppError('Рассылка не найдена', 404);
    const markup = createReplyMarkup((mailing.buttons ?? []) as unknown as TelegramButton[]);
        if (mailing.type === 'PHOTO') {
            if (!mailing.photoUrl) throw new AppError('У рассылки отсутствует photoUrl', 422);
            await this.sendWithRetry(() =>
                telegramProvider.sendPhoto(telegramId, mailing.photoUrl!, mailing.text, markup),
            );
        } else {
            await this.sendWithRetry(() =>
                telegramProvider.sendText(telegramId, mailing.text, markup),
            );
        }
    }

    async shutdown(): Promise<void> {
        for (const item of this.scheduled.values()) clearTimeout(item.timer);
        this.scheduled.clear();
        this.queue.length = 0;
        if (this.processing) await this.processing;
    }

    private enqueue(id: number): void {
        if (!this.queue.includes(id)) this.queue.push(id);
    }

    private schedule(id: number, target: number): void {
        const existing = this.scheduled.get(id);
        if (existing) clearTimeout(existing.timer);
        const remaining = target - Date.now();
        const timer = setTimeout(
            () => {
                if (target > Date.now()) {
                    this.schedule(id, target);
                    return;
                }
                this.scheduled.delete(id);
                void mailingRepository.updateStatus(id, MailingStatus.QUEUED).then(() => {
                    this.enqueue(id);
                    return this.process();
                });
            },
            Math.min(Math.max(remaining, 1), 2_147_000_000),
        );
        this.scheduled.set(id, { timer, target });
    }

    private process(): Promise<void> {
        if (this.processing) return this.processing;
        this.processing = this.processLoop().finally(() => {
            this.processing = null;
        });
        return this.processing;
    }

    private async processLoop(): Promise<void> {
        while (this.queue.length > 0) {
            const id = this.queue.shift();
            if (id === undefined) continue;
            try {
                await this.processMailing(id);
            } catch (error) {
                logger.error('mailing processing failed', error, { mailingId: id });
                await mailingRepository
                    .updateStatus(id, MailingStatus.FAILED)
                    .catch((updateError) =>
                        logger.error('failed to save mailing error status', updateError, {
                            mailingId: id,
                        }),
                    );
            }
        }
    }

    private async processMailing(id: number): Promise<void> {
        await mailingRepository.updateStatus(id, MailingStatus.PROCESSING);
        const mailing = await mailingRepository.findById(id);
        if (!mailing) throw new AppError('Рассылка не найдена', 404);
        const deliveries = await mailingRepository.findPendingDeliveries(id);
    const markup = createReplyMarkup((mailing.buttons ?? []) as unknown as TelegramButton[]);
        if (mailing.type === 'PHOTO' && !mailing.photoUrl) {
            throw new AppError('У рассылки отсутствует photoUrl', 422);
        }

        for (const delivery of deliveries) {
            try {
                const result =
                    mailing.type === 'PHOTO'
                        ? await this.sendWithRetry(() =>
                              telegramProvider.sendPhoto(
                                  delivery.recipient.telegramId.toString(),
                                  mailing.photoUrl!,
                                  mailing.text,
                                  markup,
                              ),
                          )
                        : await this.sendWithRetry(() =>
                              telegramProvider.sendText(
                                  delivery.recipient.telegramId.toString(),
                                  mailing.text,
                                  markup,
                              ),
                          );
                if (result === 'blocked') {
                    await mailingRepository.markDeliveryBlocked(
                        delivery.id,
                        config.queue.maxRetries,
                        'Получатель недоступен',
                    );
                } else {
                    await mailingRepository.markDeliverySent(delivery.id, result);
                }
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Неизвестная ошибка';
                await mailingRepository.markDeliveryFailed(
                    delivery.id,
                    config.queue.maxRetries,
                    message,
                );
            }
            if (delivery.id !== deliveries.at(-1)?.id) await this.delay(config.queue.delayMs);
        }

        await mailingRepository.updateStatus(id, MailingStatus.COMPLETED, {
            completedAt: new Date(),
        });
    }

    private async sendWithRetry(send: () => Promise<{ ok: boolean }>): Promise<number | 'blocked'> {
        let lastError: Error = new Error('Неизвестная ошибка Telegram API');
        for (let attempt = 1; attempt <= config.queue.maxRetries; attempt += 1) {
            try {
                await send();
                return attempt;
            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                if (
                    error instanceof TelegramApiError &&
                    [400, 401, 403, 404].includes(error.errorCode ?? 0)
                )
                    return 'blocked';
                if (attempt < config.queue.maxRetries) await this.delay(config.queue.retryDelayMs);
            }
        }
        throw lastError;
    }

    private delay(milliseconds: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, milliseconds));
    }
}

export const mailingQueue = new MailingQueue();
