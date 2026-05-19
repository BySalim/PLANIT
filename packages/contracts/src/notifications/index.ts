import { z } from 'zod';

export const notificationChannelSchema = z.enum(['push', 'whatsapp', 'email', 'sms']);

export type NotificationChannel = z.infer<typeof notificationChannelSchema>;
