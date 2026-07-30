export type MessageType = 'text' | 'photo';
export type ButtonType = 'url' | 'web_app';

export interface TelegramButton {
    text: string;
    url: string;
    type?: ButtonType;
}

export interface MailingInput {
    title?: string;
    text: string;
    type: MessageType;
    photoUrl?: string;
    sendAt?: Date;
    buttons: TelegramButton[];
    recipients: Array<{ telegramId: string; username?: string }>;
}

export interface TelegramReplyMarkup {
    inline_keyboard: Array<Array<{ text: string; url?: string; web_app?: { url: string } }>>;
}

export interface TelegramSendResult {
    ok: boolean;
    errorCode?: number;
    description?: string;
}
