import { z } from 'zod';
import type { MailingInput } from './types.js';

const telegramId = z
    .union([z.string(), z.number().int()])
    .transform(String)
    .refine((value) => /^-?\d+$/.test(value), 'telegramId должен быть целым числом');

const button = z.object({
    text: z.string().trim().min(1).max(64),
    url: z.url(),
    type: z.enum(['url', 'web_app']).optional(),
});

export const mailingInputSchema = z
    .object({
        title: z.string().trim().min(1).max(120).optional(),
        text: z.string().trim().min(1).max(4096),
        type: z.enum(['text', 'photo']).default('text'),
        photoUrl: z.url().optional(),
        sendAt: z.iso.datetime({ offset: true }).optional(),
        buttons: z.array(button).max(20).default([]),
        recipients: z
            .array(
                z.object({
                    telegramId: telegramId,
                    username: z.string().trim().max(64).optional(),
                }),
            )
            .min(1)
            .max(10000),
    })
    .superRefine((value, context) => {
        if (value.type === 'photo' && !value.photoUrl) {
            context.addIssue({
                code: 'custom',
                path: ['photoUrl'],
                message: 'photoUrl обязателен для photo-рассылки',
            });
        }
    });

export const parseMailingInput = (input: unknown): MailingInput => {
    const parsed = mailingInputSchema.parse(input);
    return { ...parsed, sendAt: parsed.sendAt ? new Date(parsed.sendAt) : undefined };
};
