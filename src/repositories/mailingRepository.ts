import { DeliveryStatus, MailingStatus, MessageType, Prisma } from '@prisma/client';
import { prisma } from '../infrastructure/prisma.js';
import type { MailingInput } from '../types.js';

const detailsInclude = {
    deliveries: {
        include: { recipient: true },
        orderBy: { id: 'asc' as const },
    },
};

const listSelect = {
    id: true,
    title: true,
    text: true,
    type: true,
    photoUrl: true,
    sendAt: true,
    status: true,
    createdAt: true,
    completedAt: true,
    _count: { select: { deliveries: true } },
};

export class MailingRepository {
    async create(input: MailingInput) {
        return prisma.$transaction(async (transaction) => {
            const recipients = await Promise.all(
                input.recipients.map((recipient) =>
                    transaction.recipient.upsert({
                        where: { telegramId: BigInt(recipient.telegramId) },
                        update: { username: recipient.username },
                        create: {
                            telegramId: BigInt(recipient.telegramId),
                            username: recipient.username,
                        },
                    }),
                ),
            );

            const mailing = await transaction.mailing.create({
                data: {
                    title: input.title,
                    text: input.text,
                    type: input.type === 'photo' ? MessageType.PHOTO : MessageType.TEXT,
                    photoUrl: input.photoUrl,
                    sendAt: input.sendAt,
                    buttons: input.buttons as unknown as Prisma.InputJsonValue,
                    deliveries: {
                        create: recipients.map((recipient) => ({ recipientId: recipient.id })),
                    },
                },
                include: detailsInclude,
            });

            return mailing;
        });
    }

    async findMany() {
        return prisma.mailing.findMany({ select: listSelect, orderBy: { createdAt: 'desc' } });
    }

    async findById(id: number) {
        return prisma.mailing.findUnique({ where: { id }, include: detailsInclude });
    }

    async updateStatus(id: number, status: MailingStatus, extra: Prisma.MailingUpdateInput = {}) {
        return prisma.mailing.update({ where: { id }, data: { status, ...extra } });
    }

    async findPendingDeliveries(mailingId: number) {
        return prisma.delivery.findMany({
            where: { mailingId, status: DeliveryStatus.PENDING },
            include: { recipient: true },
            orderBy: { id: 'asc' },
        });
    }

    async markDeliverySent(id: number, attempts: number) {
        return prisma.delivery.update({
            where: { id },
            data: { status: DeliveryStatus.SENT, attempts, sentAt: new Date(), errorMessage: null },
        });
    }

    async markDeliveryBlocked(id: number, attempts: number, message: string) {
        return prisma.delivery.update({
            where: { id },
            data: { status: DeliveryStatus.BLOCKED, attempts, errorMessage: message },
        });
    }

    async markDeliveryFailed(id: number, attempts: number, message: string) {
        return prisma.delivery.update({
            where: { id },
            data: { status: DeliveryStatus.FAILED, attempts, errorMessage: message },
        });
    }

    async getDeliveryStats(mailingId: number) {
        const grouped = await prisma.delivery.groupBy({
            by: ['status'],
            where: { mailingId },
            _count: { _all: true },
        });

        return grouped.reduce<Record<string, number>>((result, item) => {
            result[item.status.toLowerCase()] = item._count._all;
            return result;
        }, {});
    }
}

export const mailingRepository = new MailingRepository();
