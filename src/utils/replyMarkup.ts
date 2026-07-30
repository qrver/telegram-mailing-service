import type { TelegramButton, TelegramReplyMarkup } from '../types.js';

export const createReplyMarkup = (buttons: TelegramButton[]): TelegramReplyMarkup | undefined => {
    if (buttons.length === 0) return undefined;

    return {
        inline_keyboard: buttons.map((button) => [
            button.type === 'web_app'
                ? { text: button.text, web_app: { url: button.url } }
                : { text: button.text, url: button.url },
        ]),
    };
};
