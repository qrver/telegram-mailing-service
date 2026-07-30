import { config } from '../config.js';
import { TelegramApiError } from '../errors.js';
import { logger } from '../logger.js';
import type { TelegramReplyMarkup, TelegramSendResult } from '../types.js';

interface TelegramProvider {
    sendText(
        chatId: string,
        text: string,
        replyMarkup?: TelegramReplyMarkup,
    ): Promise<TelegramSendResult>;
    sendPhoto(
        chatId: string,
        photoUrl: string,
        caption: string,
        replyMarkup?: TelegramReplyMarkup,
    ): Promise<TelegramSendResult>;
    healthCheck(): Promise<boolean>;
}

type TelegramResponse = { ok: boolean; error_code?: number; description?: string };

class MockTelegramProvider implements TelegramProvider {
    async sendText(chatId: string, text: string): Promise<TelegramSendResult> {
        logger.info('mock Telegram message', { chatId, textLength: text.length });
        return { ok: true };
    }

    async sendPhoto(
        chatId: string,
        photoUrl: string,
        caption: string,
    ): Promise<TelegramSendResult> {
        logger.info('mock Telegram photo', { chatId, photoUrl, captionLength: caption.length });
        return { ok: true };
    }

    async healthCheck(): Promise<boolean> {
        return true;
    }
}

class LiveTelegramProvider implements TelegramProvider {
    private readonly baseUrl = `${config.telegram.apiUrl}/bot${config.telegram.token}`;

    private async call(method: string, body: Record<string, unknown>): Promise<TelegramSendResult> {
        const response = await fetch(`${this.baseUrl}/${method}`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(15_000),
        });
        const data = (await response.json()) as TelegramResponse;

        if (!response.ok || !data.ok) {
            throw new TelegramApiError(
                data.description ?? `Telegram API HTTP ${response.status}`,
                data.error_code,
            );
        }

        return { ok: true };
    }

    async sendText(chatId: string, text: string, replyMarkup?: TelegramReplyMarkup) {
        return this.call('sendMessage', {
            chat_id: chatId,
            text,
            parse_mode: 'HTML',
            reply_markup: replyMarkup,
        });
    }

    async sendPhoto(
        chatId: string,
        photoUrl: string,
        caption: string,
        replyMarkup?: TelegramReplyMarkup,
    ) {
        return this.call('sendPhoto', {
            chat_id: chatId,
            photo: photoUrl,
            caption,
            parse_mode: 'HTML',
            reply_markup: replyMarkup,
        });
    }

    async healthCheck(): Promise<boolean> {
        await this.call('getMe', {});
        return true;
    }
}

export const telegramProvider: TelegramProvider =
    config.telegram.mode === 'live' ? new LiveTelegramProvider() : new MockTelegramProvider();
