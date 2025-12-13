export interface ScraperSiteApiResponse {
  id: string
  name: string
  url: string
  lastScraped: string
  autoScrapeInterval: number | null
  isAutoEnabled: boolean
}

export interface ScraperSite {
  id: string
  name: string
  url: string
  lastScraped: string
  autoScrapeInterval: number | null
  isAutoEnabled: boolean
}

export interface UseFetchScraperSitesResult {
  scraperSites: ScraperSite[]
  isLoading: boolean
  isFetching: boolean
  isError: boolean
  error: Error | null
  refetch: () => void
}