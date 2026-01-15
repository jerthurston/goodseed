import type { HomepageContentInput } from '@/schemas/content-page.schema';

/**
 * Transform nested form data to flat Prisma structure
 * Chuyển đổi từ nested structure (hero.title) sang flat structure (heroTitle)
 */
export function transformHomepageContentToPrisma(data: HomepageContentInput) {
  return {
    // Hero Section
    heroTitle: data.hero.title,
    heroDescription: data.hero.description,
    
    // How It Works Section
    howItWorksTitle: data.howItWorks.title,
    howItWorksDescription: data.howItWorks.description,
    howItWorksSteps: data.howItWorks.steps, // Json field - keep as array
    
    // Features Section
    featuresTitle: data.features.title,
    featuresDescription: data.features.description,
    features: data.features.features, // Json field - keep as array
    
    // CTA Section
    ctaTitle: data.cta.title,
    ctaDescription: data.cta.description,
    ctaLabel: data.cta.ctaLabel,
    ctaHref: data.cta.ctaHref,
  };
}

/**
 * Transform flat Prisma data to nested form structure
 * Chuyển đổi từ flat structure (heroTitle) sang nested structure (hero.title)
 */
export function transformPrismaToHomepageContent(data: {
  heroTitle: string;
  heroDescription: string;
  howItWorksTitle: string;
  howItWorksDescription: string;
  howItWorksSteps: any; // Json
  featuresTitle: string;
  featuresDescription: string;
  features: any; // Json
  ctaTitle: string;
  ctaDescription: string;
  ctaLabel: string;
  ctaHref: string;
}): HomepageContentInput {
  return {
    hero: {
      title: data.heroTitle,
      description: data.heroDescription,
    },
    howItWorks: {
      title: data.howItWorksTitle,
      description: data.howItWorksDescription,
      steps: data.howItWorksSteps,
    },
    features: {
      title: data.featuresTitle,
      description: data.featuresDescription,
      features: data.features,
    },
    cta: {
      title: data.ctaTitle,
      description: data.ctaDescription,
      ctaLabel: data.ctaLabel,
      ctaHref: data.ctaHref,
    },
  };
}
