import { z } from 'zod';

// FAQ Item Schema
export const FaqItemSchema = z.object({
  id: z.string().optional(),
  question: z.string().min(5, 'Question must be at least 5 characters'),
  answer: z.string().min(10, 'Answer must be at least 10 characters'),
  order: z.number().int().min(0),
  isVisible: z.boolean(),
});

export type FaqItemInput = z.infer<typeof FaqItemSchema>;

// FAQ Category Schema
export const FaqCategorySchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, 'Category name must be at least 2 characters'),
  icon: z.string().min(2, 'Icon name is required'),
  order: z.number().int().min(0),
  isVisible: z.boolean(),
  items: z.array(FaqItemSchema).min(0, 'Items must be an array'), // Allow empty array for UI flexibility
});

export type FaqCategoryInput = z.infer<typeof FaqCategorySchema>;

// FAQ Page Settings Schema
export const FaqPageSettingsSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  noAnswerMessage: z.string().min(5, 'Message must be at least 5 characters'),
  contactLabel: z.string().min(2, 'Contact label is required'),
  contactHref: z.string().min(1, 'Contact link is required'),
  isPublished: z.boolean(),
});

export type FaqPageSettingsInput = z.infer<typeof FaqPageSettingsSchema>;

// Complete FAQ Content Schema (for form and API)
export const FaqContentSchema = z.object({
  settings: FaqPageSettingsSchema,
  categories: z.array(FaqCategorySchema).min(0, 'Categories must be an array'), // Allow empty for UI
});

export type FaqContentInput = z.infer<typeof FaqContentSchema>;
