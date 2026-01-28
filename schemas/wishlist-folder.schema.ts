import { z } from 'zod';

/**
 * Schema for creating a new wishlist folder
 * 
 * Note: `order` is auto-computed on server based on existing folders count
 */
export const createWishlistFolderSchema = z.object({
  name: z
    .string()
    .min(1, 'Folder name is required')
    .max(50, 'Folder name must be less than 50 characters')
    .trim(),
});

/**
 * Schema for updating a wishlist folder
 */
export const updateWishlistFolderSchema = z.object({
  name: z
    .string()
    .min(1, 'Folder name is required')
    .max(50, 'Folder name must be less than 50 characters')
    .trim()
    .optional(),
  order: z
    .number()
    .int('Order must be an integer')
    .min(0, 'Order must be non-negative')
    .optional(),
});

/**
 * TypeScript types inferred from schemas
 */
export type CreateWishlistFolderInput = z.infer<typeof createWishlistFolderSchema>;
export type UpdateWishlistFolderInput = z.infer<typeof updateWishlistFolderSchema>;
