import { title } from 'process';
import { z } from 'zod';

// ============================================
// Homepage Content Schema
// ============================================

// Schema cho Hero Section
const HeroSectionSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  description: z.string().min(1, 'Description is required').max(500, 'Description too long'),
});

// Schema cho How It Works Steps
const HowItWorksSectionSchema = z.object({
  title: z.string().min(1, 'Step title required').max(100, 'Title too long'),
  description: z.string().min(1, 'Step description required').max(300, 'Description too long'),
  steps: z.array(
    z.object({
        title:z.string().min(1, 'Title is required').max(200, 'Title too long'),
        description: z.string().min(1, 'Description is required').max(300, 'Description too long'),
    })
  )
});

// Schema cho Features
const FeatureSectionSchema = z.object({
  title: z.string().min(1, 'Feature title required').max(200, 'Title too long'),
  description: z.string().min(1, 'Feature description required').max(500, 'Description too long'),
  features: z.array(
    z.object({
        icon: z.string(),
        title: z.string().min(1, 'Feature title required').max(200, 'Title too long'),
        description: z.string().min(1, 'Feature description required').max(500, 'Description too long'),
    })
  )
});

// Schema cho CTA Section
const CtaSectionSchema = z.object({
  title: z.string().min(1, 'CTA title required').max(200, 'Title too long'),
  description: z.string().min(1, 'CTA description required').max(500, 'Description too long'),
  ctaLabel: z.string().min(1, 'CTA button label required').max(50, 'Label too long'),
  ctaHref: z.string().min(1, 'CTA link required').refine(
    (val) => /^(https?:\/\/)|(\/[^\s]*)/.test(val),
    'Must be a valid URL or path (e.g., /seeds or https://...)'
  ),
});

// Main Homepage Content Schema - khớp với HomepageContent model trong Prisma
export const HomepageContentSchema = z.object({
  // Hero Section
  hero: HeroSectionSchema,
  // How It Works Section
  howItWorks: HowItWorksSectionSchema,
  // Features Section
  features: FeatureSectionSchema,
  // CTA Section
  cta: CtaSectionSchema,
});

// Type inference
export type HomepageContentInput = z.infer<typeof HomepageContentSchema>;

// ============================================
// FAQ Schema
// ============================================

// FAQ Category Schema - khớp với FaqCategory model
export const FaqCategorySchema = z.object({
  id: z.string().optional(), // Optional for create, required for update
  name: z.string().min(1, 'Category name required').max(100, 'Name too long'),
  icon: z.string().min(1, 'Icon name required'), // FontAwesome icon name
  order: z.number().int().min(0).default(0),
  isVisible: z.boolean().default(true),
});

// FAQ Item Schema - khớp với Faq model
export const FaqSchema = z.object({
  id: z.string().optional(), // Optional for create
  question: z.string().min(1, 'Question is required').max(500, 'Question too long'),
  answer: z.string().min(1, 'Answer is required').max(5000, 'Answer too long'),
  order: z.number().int().min(0).default(0),
  categoryId: z.string().min(1, 'Category is required'),
  isVisible: z.boolean().default(true),
});

// FAQ Create/Update Schema
export const FaqCreateSchema = FaqSchema.omit({ id: true });
export const FaqUpdateSchema = FaqSchema.partial().required({ id: true });

// FAQ Page Settings Schema - khớp với FaqPageSettings model
export const FaqPageSettingsSchema = z.object({
  title: z.string().min(1, 'Title required').max(200, 'Title too long').default('Frequently Asked Questions'),
  description: z.string().min(1, 'Description required').max(500, 'Description too long'),
  noAnswerMessage: z.string().min(1, 'Message required').max(200, 'Message too long').default("Can't find the answer you're looking for?"),
  contactLabel: z.string().min(1, 'Contact label required').max(50, 'Label too long').default('Contact Us'),
  contactHref: z.string().min(1, 'Contact link required').refine(
    (val) => /^(https?:\/\/)|(\/[^\s]*)/.test(val),
    'Must be a valid URL or path'
  ).default('/contact'),
});

// Type inference
export type FaqCategoryInput = z.infer<typeof FaqCategorySchema>;
export type FaqInput = z.infer<typeof FaqSchema>;
export type FaqCreateInput = z.infer<typeof FaqCreateSchema>;
export type FaqUpdateInput = z.infer<typeof FaqUpdateSchema>;
export type FaqPageSettingsInput = z.infer<typeof FaqPageSettingsSchema>;

// ============================================
// API Response Types
// ============================================

// Homepage API Response
export interface HomepageContentResponse extends HomepageContentInput {
  id: string;
  isPublished: boolean;
  updatedAt: string;
  updatedBy: string;
}

// FAQ API Response
export interface FaqCategoryResponse extends FaqCategoryInput {
  id: string;
  createdAt: string;
  updatedAt: string;
  faqs?: FaqResponse[];
}

export interface FaqResponse extends FaqInput {
  id: string;
  categoryId: string;
  createdAt: string;
  updatedAt: string;
}

export interface FaqPageSettingsResponse extends FaqPageSettingsInput {
  id: string;
  isPublished: boolean;
  updatedAt: string;
  updatedBy: string;
}
