import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faClipboardList, faClock, faCheckCircle, faTimesCircle, faSpinner, faRobot, faUser, faSearch, faSave, faEdit } from '@fortawesome/free-solid-svg-icons';
import { DashboardCard, DashboardCardHeader } from '@/app/dashboard/(components)/DashboardCard';
import styles from '@/app/dashboard/(components)/dashboardAdmin.module.css';
import { useFetchScrapeJobs, type ScrapeJob } from '@/hooks/admin/scrape-job/useFetchScrapeJobs';
import { apiLogger } from '@/lib/helpers/api-logger';

interface SellerScrapeJobLogsProps {
  sellerId: string;
}

export default function SellerScrapeJobLogs({ sellerId }: SellerScrapeJobLogsProps) {
  const { jobs: scrapeJobs, isLoading, error } = useFetchScrapeJobs({
    sellerId,
    limit: 5,
    // timeframe: undefined // Get 5 most recent jobs for this seller
  });

  // Sort jobs by createdAt descending to ensure we show the 5 most recent jobs
  const sortedJobs = scrapeJobs?.sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  ).slice(0, 5); // Extra safety to ensure only 5 jobs

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <FontAwesomeIcon icon={faCheckCircle} className="text-green-500" />;
      case 'FAILED':
        return <FontAwesomeIcon icon={faTimesCircle} className="text-red-500" />;
      case 'ACTIVE':
        return <FontAwesomeIcon icon={faSpinner} className="text-blue-500 animate-spin" />;
      case 'WAITING':
      case 'DELAYED':
        return <FontAwesomeIcon icon={faClock} className="text-yellow-500" />;
      default:
        return <FontAwesomeIcon icon={faClock} className="text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'text-green-600';
      case 'FAILED':
        return 'text-red-600';
      case 'ACTIVE':
        return 'text-blue-600';
      case 'WAITING':
      case 'DELAYED':
        return 'text-yellow-600';
      default:
        return 'text-gray-500';
    }
  };

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case 'auto':
        return <FontAwesomeIcon icon={faRobot} className="text-blue-500" />;
      case 'manual':
      case 'test':
        return <FontAwesomeIcon icon={faUser} className="text-purple-500" />;
      default:
        return <FontAwesomeIcon icon={faUser} className="text-gray-400" />;
    }
  };

  return (
    <DashboardCard>
      <DashboardCardHeader className={styles.cardHeader}>
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            <FontAwesomeIcon icon={faClipboardList} className="text-xl text-(--brand-primary)" />
            <h2 className="font-['Archivo_Black'] text-xl uppercase text-(--text-primary)">
              Recent Scrape Jobs
            </h2>
            {!isLoading && sortedJobs && (
              <span className="bg-(--brand-primary) text-white px-2 py-1 rounded-full text-xs font-medium">
                {sortedJobs.length}/5
              </span>
            )}
          </div>
        </div>
        <div className="text-sm font-['Poppins'] text-(--text-primary-muted)">
          Showing up to 5 most recent scraping activities and their status
        </div>
      </DashboardCardHeader>

      <div className="p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-(--brand-primary) border-t-transparent"></div>
              <span className="text-(--text-primary-muted)">Loading scrape jobs...</span>
            </div>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <FontAwesomeIcon icon={faTimesCircle} className="text-red-500 text-2xl mb-3" />
            <p className="text-(--text-primary-muted)">
              Failed to load scrape jobs
            </p>
            <p className="text-sm text-red-600 mt-1">
              {error || 'Unknown error occurred'}
            </p>
          </div>
        ) : !sortedJobs || sortedJobs.length === 0 ? (
          <div className="text-center py-8">
            <FontAwesomeIcon icon={faClipboardList} className="text-(--text-primary-muted) text-3xl mb-3" />
            <p className="text-(--text-primary-muted) font-medium">
              No recent scrape jobs found for this seller
            </p>
            <p className="text-sm text-(--text-primary-muted) mt-1">
              Start a manual scrape or enable auto scraping to see the 5 most recent job logs here
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedJobs?.map((job: ScrapeJob) => (
              <div 
                key={job.id}
                className="border-dashed border border-(--border-color) p-4 hover:bg-(--card-bg-secondary) transition-colors"
              >
                <div className='flex lg:flex-row lg:justify-between flex-col'>
                {/* Job Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(job.status)}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`font-['Poppins'] font-semibold ${getStatusColor(job.status)}`}>
                          {job.status}
                        </span>
                        <div className="flex items-center gap-1">
                          {getModeIcon(job.mode)}
                          <span className="text-xs bg-(--bg-section) px-2 py-1 rounded font-['Poppins'] text-(--text-primary-muted) uppercase">
                            {job.mode}
                          </span>
                        </div>
                      </div>
                      <div className="text-xs text-(--text-primary-muted) mt-1">
                        Job ID: {job.id}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-(--text-primary-muted)">
                      {new Date(job.createdAt).toLocaleDateString()} {new Date(job.createdAt).toLocaleTimeString()}
                    </div>
                    {job.duration && (
                      <div className="text-xs text-(--text-primary-muted) mt-1">
                        Duration: {Math.round(job.duration / 60)}min
                      </div>
                    )}
                  </div>
                </div>

                {/* Job Metrics */}
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-lg font-['Archivo_Black'] ">
                      {job.productsScraped || 0}
                    </div>
                    <div className="text-xs text-(--text-primary-muted) flex items-center flex-col">
                      <FontAwesomeIcon icon={faSearch} />
                      <span className='text-neutral-500 font-bold'>
                        Scraped
                        </span> 
                    </div>
                  </div>
                  <div>
                    <div className="text-lg font-['Archivo_Black'] ">
                      {job.productsSaved || 0}
                    </div>
                    <div className="text-xs text-(--text-primary-muted) flex items-center flex-col">
                      <FontAwesomeIcon icon={faSave}/>
                      <span className='text-neutral-500 font-bold'>
                        Saved
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="text-lg font-['Archivo_Black'] text-(--brand-primary)">
                      {job.productsUpdated || 0}
                    </div>
                    <div className="text-xs text-(--text-primary-muted) flex items-center flex-col">
                      <FontAwesomeIcon icon={faEdit}/>
                      <span className='text-neutral-500 font-bold'>
                        Updated
                      </span>
                    </div>
                  </div>
                </div>
</div>
                {/* Error Message */}
                {job.errorMessage && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded text-sm">
                    <div className="font-['Poppins'] font-semibold text-red-700 mb-1">
                      Error Details:
                    </div>
                    <div className="text-red-600 text-xs font-mono">
                      {job.errorMessage}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {scrapeJobs.length >= 10 && (
              <div className="text-center pt-4">
                <p className="text-sm text-(--text-primary-muted)">
                  Showing last 10 jobs. View more in the Jobs dashboard.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardCard>
  );
}