import { z } from 'zod';

/**
 * Contact Submission Schema
 * Validation for contact form submission
 */
export const contactSubmissionSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must not exceed 100 characters')
    .trim(),
  
  email: z
    .email('Invalid email address')
    .max(255, 'Email must not exceed 255 characters')
    .toLowerCase()
    .trim(),
  
  category: z.enum(['general', 'support', 'business', 'feedback'], {
    message: 'Please select a valid category',
  }),
  
  message: z
    .string()
    .min(10, 'Message must be at least 10 characters')
    .max(5000, 'Message must not exceed 5000 characters')
    .trim(),
});

export type ContactSubmissionInput = z.infer<typeof contactSubmissionSchema>;

/**
 * Contact category options for dropdown
 */
export const contactCategories = [
  { value: 'general', label: 'General Inquiry' },
  { value: 'support', label: 'Technical Support' },
  { value: 'business', label: 'Business Partnership' },
  { value: 'feedback', label: 'Feedback & Suggestions' },
] as const;
