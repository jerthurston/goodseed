'use client'

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ScrapeJob, useFetchScrapeJobs } from '@/hooks/admin/scrape-job/useFetchScrapeJobs';
import { useDeleteScrapeJob } from '@/hooks/admin/scrape-job/useDeleteScrapeJob';
import { apiLogger } from '@/lib/helpers/api-logger';
import { formatRelativeTime } from '@/lib/helpers/formtRelativeTime';
import styles from './dashboardAdmin.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSearch,
  faFilter,
  faRefresh,
  faTrash,
  faPlay,
  faDatabase,
  faClock,
  faUser,
  faCheckCircle,
  faExclamationTriangle,
  faSpinner,
  faTrashCan
} from '@fortawesome/free-solid-svg-icons';
import JobCardItem from '@/components/custom/card/JobCardItem';

/**
 * Simple job filters
 */
interface JobFilters {
  search: string;
  status: 'ALL' | 'COMPLETED' | 'FAILED' | 'ACTIVE' | 'CANCELLED' | 'CREATED' | 'WAITING' | 'DELAYED';
  sellerId: string | 'ALL';
}

/**
 * Props
 */
interface AlertTabContentProps {
  sellers: Array<{ id: string; name: string }>;
  onRefreshData?: () => void;
}

/**
 * Simple Scrape Jobs Management Component
 */
export function AlertTabContent({ sellers, onRefreshData }: AlertTabContentProps) {
  // State
  const [filters, setFilters] = useState<JobFilters>({
    search: '',
    status: 'ALL',
    sellerId: 'ALL'
  });

  const [selectedJobs, setSelectedJobs] = useState<Set<string>>(new Set());

  // Hooks
  const {
    jobs: allJobs,
    isLoading,
    error: jobsError,
    refreshJobs
  } = useFetchScrapeJobs({
    timeframe: 1440, // 24 hours (was 60 minutes - too short to show all auto jobs)
    limit: 100
  });
  // Log all jobs
  apiLogger.info('[LOG UI app\dashboard\(components)\AlertTabContent.tsx ]:', { allJobs });

  const { deleteJob, isDeletingJob } = useDeleteScrapeJob();

  // Filter jobs
  const filteredJobs = useMemo(() => {
    if (!allJobs) return [];

    return allJobs.filter(job => {
      // Search filter
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        if (!job.seller.name?.toLowerCase().includes(searchTerm) &&
          !job.seller.id?.toLowerCase().includes(searchTerm)) {
          return false;
        }
      }

      // Status filter
      if (filters.status !== 'ALL' && job.status !== filters.status) {
        return false;
      }

      // Seller filter
      if (filters.sellerId !== 'ALL' && job.seller.id !== filters.sellerId) {
        return false;
      }

      return true;
    });
  }, [allJobs, filters]);

  // Get job stats
  const jobStats = useMemo(() => {
    if (!allJobs) return { total: 0, completed: 0, failed: 0, active: 0 };

    return allJobs.reduce((stats, job) => {
      stats.total++;
      if (job.status === 'COMPLETED') stats.completed++;
      else if (job.status === 'FAILED') stats.failed++;
      else if (job.status === 'ACTIVE') stats.active++;
      return stats;
    }, { total: 0, completed: 0, failed: 0, active: 0 });
  }, [allJobs]);

  // Stats cards configuration
  const statsCards = useMemo(() => [
    {
      icon: faDatabase,
      iconColor: 'text-blue-600',
      value: jobStats.total,
      label: 'Total Jobs',
      className: 'flex flex-row items-center gap-1'
    },
    {
      icon: faCheckCircle,
      iconColor: 'text-green-600',
      value: jobStats.completed,
      label: 'Completed'
    },
    {
      icon: faExclamationTriangle,
      iconColor: 'text-red-600',
      value: jobStats.failed,
      label: 'Failed'
    },
    {
      icon: faSpinner,
      iconColor: 'text-blue-600',
      value: jobStats.active,
      label: 'Active'
    }
  ], [jobStats]);

  // const handleDeleteJob = async (job: ScrapeJob) => {
  //   try {
  //     await deleteJob(job.id);
  //     toast.success(`Deleted job for ${job.seller.name}`);
  //     setSelectedJobs(prev => {
  //       const newSet = new Set(prev);
  //       newSet.delete(job.id);
  //       return newSet;
  //     });
  //   } catch (error) {
  //     toast.error('Failed to delete job');
  //     apiLogger.logError('[AlertTabContent] Delete failed', error as Error, { jobId: job.id });
  //   }
  // };

  const handleBulkDelete = async () => {
    if (selectedJobs.size === 0) return;

    const selectedJobList = filteredJobs.filter(job => selectedJobs.has(job.id));

    try {
      const deletePromises = selectedJobList.map(job => deleteJob(job.id));
      const results = await Promise.allSettled(deletePromises);

      const successful = results.filter(result => result.status === 'fulfilled');
      const failed = results.filter(result => result.status === 'rejected');

      if (successful.length > 0) {
        toast.success(`Successfully deleted ${successful.length} job(s)`);
        setSelectedJobs(new Set());
      }

      if (failed.length > 0) {
        toast.error(`Failed to delete ${failed.length} job(s)`);
      }
    } catch (error) {
      toast.error('Bulk delete operation failed');
      apiLogger.logError('[AlertTabContent] Bulk delete failed', error as Error);
    }
  };

  // const toggleJobSelection = (jobId: string) => {
  //   setSelectedJobs(prev => {
  //     const newSet = new Set(prev);
  //     if (newSet.has(jobId)) {
  //       newSet.delete(jobId);
  //     } else {
  //       newSet.add(jobId);
  //     }
  //     return newSet;
  //   });
  // };

  const selectAllJobs = () => {
    setSelectedJobs(new Set(filteredJobs.map(job => job.id)));
  };

  const clearSelection = () => {
    setSelectedJobs(new Set());
  };

  // Toggle individual job selection
  const toggleJobSelection = (jobId: string) => {
    setSelectedJobs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(jobId)) {
        newSet.delete(jobId);
      } else {
        newSet.add(jobId);
      }
      return newSet;
    });
  };

  return (
    <div className={styles.tabContent}>
      {/*--> 1. Header with stats */}
      <h2 className={styles.alertTitle}>Scrape Jobs Management</h2>

      {/*--> 2. Filter Toolbar */}
      <div className={styles.alertToolbar}>
        {/* Quick filters */}
        <div className={`${styles.filterGroup}`}>
          {/* Status filter */}
          <select
            value={filters.status}
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as JobFilters['status'] }))}
            className={styles.filterSelect}
          >
            <option value="ALL">All Status</option>
            <option value="COMPLETED">Completed</option>
            <option value="FAILED">Failed</option>
            <option value="ACTIVE">Active</option>
            <option value="WAITING">Waiting</option>
            <option value="CREATED">Created</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
          {/* Seller filter */}
          <select
            value={filters.sellerId}
            onChange={(e) => setFilters(prev => ({ ...prev, sellerId: e.target.value }))}
            className={styles.filterSelect}
          >
            <option value="ALL">All Sellers</option>
            {sellers.map(seller => (
              <option key={seller.id} value={seller.id}>
                {seller.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/*--> 3. Scraper jobs stats */}
      <div className={styles.alertHeader}>
        {/* Overview scrape job status section*/}
        <div className={styles.alertStats}>
          {statsCards.map((stat, index) => (
            <div key={stat.label} className={styles.statCard}>
              <FontAwesomeIcon icon={stat.icon} className={stat.iconColor} />
              <div className={stat.className}>
                <div className={styles.statNumber}>{stat.value}</div>
                <div className={styles.statLabel}>{stat.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/*--> 4. Bulk selection toolbar */}
      {filteredJobs.length > 0 && (
        <div className={styles.bulkToolbar}>
          <div className={styles.bulkActions}>
            <Button
              variant="ghost"
              size="sm"
              onClick={selectAllJobs}
              className={styles.bulkActionBtn}
            >
              Select All ({filteredJobs.length})
            </Button>

            {selectedJobs.size > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSelection}
                className={styles.bulkActionBtn}
              >
                Clear Selection
              </Button>
            )}
          </div>

          {/* Actions */}
          <div className={styles.actionGroup}>
            {selectedJobs.size > 0 && (
              <button
                onClick={handleBulkDelete}
                disabled={isDeletingJob}
                className={styles.bulkDeleteButton}
              >
                <FontAwesomeIcon icon={faTrashCan} />
                <span>
                  Delete ({selectedJobs.size})
                </span>
              </button>
            )}
          </div>
        </div>
      )}

      {/*--> 5. Jobs list */}
      <div className={styles.jobsList}>
        {/*----> 5.1 Jobs fetch loading */}
        {isLoading && (
          <div className={styles.loadingState}>
            <FontAwesomeIcon icon={faSpinner} className="animate-spin text-2xl text-gray-400" />
            <p>Loading jobs...</p>
          </div>
        )}
        {/*----> 5.2 Jobs fetch error */}
        {jobsError && (
          <div className={styles.errorState}>
            <FontAwesomeIcon icon={faExclamationTriangle} className="text-red-500 text-2xl" />
            <p>Failed to load jobs</p>
            <Button 
            onClick={refreshJobs} 
            variant="outline" 
            size="sm"
            >
              <FontAwesomeIcon icon={faRefresh} />
              Try Again
            </Button>
          </div>
        )}
        {/*----> 5.3 Jobs empty state */}
        {!isLoading && !jobsError && filteredJobs.length === 0 && (
          <div className={styles.emptyState}>
            <FontAwesomeIcon icon={faDatabase} className="text-gray-400 text-2xl" />
            <p>No jobs found</p>
          </div>
        )}
        {/*----> 5.4 Job listings */}
        {filteredJobs.map(job => (
          <JobCardItem 
            key={job.id} 
            job={job}
            selectedJobs={selectedJobs}
            onToggleSelection={toggleJobSelection}
            showCheckbox={selectedJobs.size > 0}
          />
        )
        )}
      </div>
    </div>
  );
}
