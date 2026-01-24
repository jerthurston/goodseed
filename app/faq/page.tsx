import { Suspense } from 'react';
import FAQPageClient from './FAQPageClient';
import { BeatLoaderSpinner } from '@/components/custom/loading';

// Cache ISR - 6 hours (max safe value)
export const revalidate = 21600; // 6 hours = 6 * 60 * 60

export default function FAQPage() {
  return (
    <Suspense fallback={<BeatLoaderSpinner />}>
      <FAQPageClient />
    </Suspense>
  );
}
