import { z } from 'zod';

/**
 * Notification Preference Update Schema
 * Validates user notification settings
 */
export const notificationPreferenceSchema = z.object({
  receiveSpecialOffers: z.boolean({
    message: 'Special offers preference must be a boolean',
  }),
  receivePriceAlerts: z.boolean({
    message: 'Price alerts preference must be a boolean',
  }),
  receiveBackInStock: z.boolean({
    message: 'Back in stock preference must be a boolean',
  }),
});

/**
 * Partial schema for updating individual preferences
 */
export const notificationPreferenceUpdateSchema = notificationPreferenceSchema.partial();

/**
 * Type inference from schema
 */
export type NotificationPreferenceInput = z.infer<typeof notificationPreferenceSchema>;
export type NotificationPreferenceUpdate = z.infer<typeof notificationPreferenceUpdateSchema>;
