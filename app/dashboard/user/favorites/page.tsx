import { BeatLoaderSpinner } from '@/components/custom/loading'
import React, { Suspense } from 'react'
import FavoritePageClient from './FavoritePageClient'

// No cache - Always fetch fresh data for user dashboard
export const dynamic = 'force-dynamic';
const FavoritePage = () => {
  return (
    <Suspense fallback={<BeatLoaderSpinner />}>
      <FavoritePageClient />
    </Suspense>
  )
}

export default FavoritePage