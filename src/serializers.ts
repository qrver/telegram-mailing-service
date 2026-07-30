import type { TelegramButton } from './types.js';

export const serializeMailing = (value: unknown) => {
    const mailing = value as {
        id: number;
        title: string | null;
        text: string;
        type: string;
        photoUrl: string | null;
        buttons?: unknown;
        sendAt: Date | null;
        status: string;
        createdAt: Date;
        completedAt: Date | null;
        startedAt?: Date | null;
        cancelledAt?: Date | null;
        deliveries?: Array<{
            id: number;
            status: string;
            attempts: number;
            errorMessage: string | null;
            sentAt: Date | null;
            recipient: { telegramId: bigint; username: string | null };
        }>;
        _count?: { deliveries: number };
    };

    return {
        id: mailing.id,
        title: mailing.title,
        text: mailing.text,
        type: mailing.type.toLowerCase(),
        photoUrl: mailing.photoUrl,
        buttons: (mailing.buttons ?? []) as TelegramButton[],
        sendAt: mailing.sendAt?.toISOString() ?? null,
        status: mailing.status.toLowerCase(),
        createdAt: mailing.createdAt.toISOString(),
        startedAt: mailing.startedAt?.toISOString() ?? null,
        completedAt: mailing.completedAt?.toISOString() ?? null,
        cancelledAt: mailing.cancelledAt?.toISOString() ?? null,
        recipientsCount: mailing._count?.deliveries ?? mailing.deliveries?.length ?? 0,
        deliveries: mailing.deliveries?.map((delivery) => ({
            id: delivery.id,
            telegramId: delivery.recipient.telegramId.toString(),
            username: delivery.recipient.username,
            status: delivery.status.toLowerCase(),
            attempts: delivery.attempts,
            errorMessage: delivery.errorMessage,
            sentAt: delivery.sentAt?.toISOString() ?? null,
        })),
    };
};
