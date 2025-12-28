
export interface ScrapeJobConfig {
  fullSiteCrawl?: boolean;
  startPage?: number;
  endPage?: number;
}
/**
 * completedAt
: 
"2025-12-28T21:03:29.821Z"
createdAt
: 
"2025-12-28T21:01:17.411Z"
currentPage
: 
0
duration
: 
132429
endPage
: 
null
errorDetails
: 
null
errorMessage
: 
null
errors
: 
0
id
: 
"cmjq7seeb0008pwsbjj97276c"
jobId
: 
"manual_1766955677410_cf3c2b3b"
maxPages
: 
null
mode
: 
"manual"
productsSaved
: 
0
productsScraped
: 
480
productsUpdated
: 
480
sellerId
: 
"cmjoskrq40000rksbn4hm8ixt"
startPage
: 
null
startedAt
: 
"2025-12-28T21:01:17.392Z"
status
: 
"COMPLETED"
targetCategoryId
: 
null
totalPages
: 
30
updatedAt
: 
"2025-12-28T21:17:50.968Z"
 */
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

