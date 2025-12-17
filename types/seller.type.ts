// Keep legacy Seller interface for backward compatibility
export interface SellerStats {
  successRate: number
  productsScraped: number
  totalRuns: number
}

export interface Seller {
  id: string
  name: string
  url: string
  isActive: boolean
  lastScraped?: string
  stats?: SellerStats
}

export interface UseFetchSellersResult {
  sellers: SellerRaw[]
  isLoading: boolean
  isFetching: boolean
  isError: boolean
  error: Error | null
  refetch: () => void
}

// Raw seller data type from Prisma query
export interface SellerRaw {
  id: string;
  name: string;
  url: string;
  isActive: boolean;
  scrapeLogs: Array<{
    id: string;
    timestamp: Date;
  }>;
  scrapeJobs: Array<{
    id: string;
    status: string;
    createdAt: Date;
  }>;
  seedCategories: Array<{
    id: string;
    seedProducts: Array<{
      id: string;
    }>;
  }>;
}

// UI-friendly seller data type
export interface SellerUI {
  id: string;
  name: string;
  url: string;
  isActive: boolean;
  lastScraped: string;
  autoScrapeInterval: number | null
  isAutoEnabled: boolean
  stats: {
    successRate: number;
    productsScraped: number;
    totalRuns: number;
  };
}

// Simple response interfaces for update operations
export interface SellerUpdateResponse {
  id: string
  name: string
  url: string
  isActive: boolean
}

