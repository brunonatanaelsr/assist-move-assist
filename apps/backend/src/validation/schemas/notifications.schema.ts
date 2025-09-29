import { z } from 'zod';

const anyOptional = z.any().optional();
const emptyObject = z.object({}).optional();
const notificationIdParams = z.object({ id: z.coerce.number() });

export const pushSubscriptionRequestSchema = z.object({
  body: z
    .object({
      endpoint: z.string().trim().url('Endpoint inválido'),
      expirationTime: z.union([z.number().nonnegative(), z.null()]).optional(),
      keys: z.object({
        p256dh: z.string().trim().min(1, 'Chave p256dh é obrigatória'),
        auth: z.string().trim().min(1, 'Chave auth é obrigatória')
      })
    })
    .strict(),
  params: emptyObject,
  query: anyOptional
});

export const updateNotificationRequestSchema = z.object({
  params: notificationIdParams,
  body: z.object({ read: z.boolean().optional() }),
  query: anyOptional
});

export const deleteNotificationRequestSchema = z.object({
  params: notificationIdParams,
  body: anyOptional,
  query: anyOptional
});

export const notificationPreferencesRequestSchema = z.object({
  body: z.object({}).passthrough(),
  query: anyOptional,
  params: emptyObject
});

export const createNotificationRequestSchema = z.object({
  body: z.object({
    user_id: z.coerce.number(),
    title: z.string().trim().min(1),
    message: z.string().trim().min(1),
    type: z.string().trim().optional(),
    action_url: z.string().trim().url().optional().nullable(),
    data: z.any().optional()
  }),
  query: anyOptional,
  params: emptyObject
});
