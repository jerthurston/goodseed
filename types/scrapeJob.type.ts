
export interface ScrapeJobConfig {
  fullSiteCrawl?: boolean;
  startPage?: number;
  endPage?: number;
  mode?: 'manual' | 'auto' | 'test';
}

export interface ScrapeJobRaw {
  completedAt: string | null;
  createdAt: string;
  currentPage: number;
  duration: number;
  endPage: number | null;
  errorDetails: string | null;
  errorMessage: string | null;
  errors: number;
  id: string;
  jobId: string;
  maxPages: number | null;
  mode: string;
  productsSaved: number;
  productsScraped: number;
  productsUpdated: number;
  sellerId: string;
  startPage: number | null;
  startedAt: string;
  status: string;
  targetCategoryId: string | null;
  totalPages: number;
  updatedAt: string;
}

