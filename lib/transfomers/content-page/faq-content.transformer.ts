import type { FaqContentInput } from '@/schemas/faq.schema';
import type { Faq, FaqCategory, FaqPageSettings } from '@prisma/client';

/**
 * Transform nested FAQ content structure to Prisma format
 * Used when saving form data to database
 */
export function transformFaqContentToPrisma(data: FaqContentInput) {
  return {
    settings: data.settings,
    categories: data.categories.map((category) => ({
      id: category.id,
      name: category.name,
      icon: category.icon,
      order: category.order,
      isVisible: category.isVisible,
      items: category.items.map((item) => ({
        id: item.id,
        question: item.question,
        answer: item.answer,
        order: item.order,
        isVisible: item.isVisible,
      })),
    })),
  };
}

/**
 * Transform Prisma FAQ data to nested content structure
 * Used when fetching data from database for form or API
 */
export function transformPrismaToFaqContent(
  settings: FaqPageSettings,
  categories: (FaqCategory & { faqs: Faq[] })[]
): FaqContentInput {
  return {
    settings: {
      title: settings.title,
      description: settings.description,
      noAnswerMessage: settings.noAnswerMessage,
      contactLabel: settings.contactLabel,
      contactHref: settings.contactHref,
      isPublished: settings.isPublished,
    },
    categories: categories
      .sort((a, b) => a.order - b.order)
      .map((category) => ({
        id: category.id,
        name: category.name,
        icon: category.icon,
        order: category.order,
        isVisible: category.isVisible,
        items: category.faqs
          .sort((a, b) => a.order - b.order)
          .map((faq) => ({
            id: faq.id,
            question: faq.question,
            answer: faq.answer,
            order: faq.order,
            isVisible: faq.isVisible,
          })),
      })),
  };
}
