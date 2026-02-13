'use client';
import { ScrapeJob } from '@/hooks/admin/scrape-job/useFetchScrapeJobs';
import React from 'react'
import styles from '@/app/dashboard/(components)/dashboardAdmin.module.css'
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
  faTrashCan,
  faSeedling,
  faLightbulb,
  faClockFour
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { formatRelativeTime } from '@/lib/helpers/formtRelativeTime';
import { Button } from '@/components/ui/button';
import { useDeleteScrapeJob } from '@/hooks/admin/scrape-job';
import { toast } from 'sonner';
import { apiLogger } from '@/lib/helpers/api-logger';
import { faIdeal } from '@fortawesome/free-brands-svg-icons';
import { Flashlight } from 'lucide-react';

interface JobCardItemProps {
  job: ScrapeJob;
  selectedJobs: Set<string>;
  onToggleSelection?: (jobId: string) => void;
  showCheckbox?: boolean;
}

const JobCardItem: React.FC<JobCardItemProps> = ({
  job,
  selectedJobs,
  onToggleSelection,
  showCheckbox = false
}) => {
  const { deleteJob, isDeletingJob } = useDeleteScrapeJob();
  const statusDisplay = getJobStatusDisplay(job);
  const isSelected = selectedJobs.has(job.id);

  const toggleJobSelection = (jobId: string) => {
    if (onToggleSelection) {
      onToggleSelection(jobId);
    }
  };

  const handleDeleteJob = async (job: ScrapeJob) => {
    try {
      await deleteJob(job.id);
      toast.success(`Deleted job for ${job.seller.name}`);
      // Notify parent to remove from selection
      if (isSelected && onToggleSelection) {
        onToggleSelection(job.id);
      }
    } catch (error) {
      toast.error('Failed to delete job');
      apiLogger.logError('[AlertTabContent] Delete failed', error as Error, { jobId: job.id });
    }
  };
  return (
    <div
      key={job.id}
      className={`${styles.jobItem} ${isSelected ? styles.jobItemSelected : ''}`}
    >
      {/*--> 1. Checkbox - Only show when showCheckbox is true */}
      {showCheckbox && (
        <div className={styles.jobCheckbox}>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => toggleJobSelection(job.id)}
            className={styles.checkbox}
          />
        </div>
      )}

      {/*--> 2. Job info */}
      <div className={styles.jobInfo}>
        <div className={styles.jobHeader}>

         <div className='flex flex-row gap-4'>
           <div className={styles.jobSeller}>
            <FontAwesomeIcon icon={faSeedling} className="text-(--brand-primary)" />
            <span className="font-extrabold text-sm">{job.seller.name}</span>
          </div>

          <div className={styles.jobStatus}>
            <FontAwesomeIcon
              icon={statusDisplay.icon}
              className={`${statusDisplay.color} ${job.status === 'ACTIVE' ? 'animate-spin' : ''}`}
            />
            <span className={styles.jobStatusText}>
              {job.status}
            </span>
          </div>
         </div>

          <div className='flex flex-row gap-4'>
          {/* Job Mode */}
            <div className="flex flex-row gap-1">
              <FontAwesomeIcon icon={faLightbulb} className='text-yellow-400'/>
              <span className={`text-sm font-extrabold`}>
                {job.mode.toUpperCase()} MODE
              </span>
            </div>
            {/* Scraping time ago */}
            <div className="flex flex-row gap-1 items-center">
              <FontAwesomeIcon icon={faClockFour} />
              <span className='text-sm font-extrabold text-(--text-primary)'>{formatRelativeTime(new Date(job.createdAt))}</span>
            </div>
          </div>
        </div>

        <div className={styles.jobDetails}>
          {/* Always show basic progress info */}
          <div className={`grid lg:flex lg:flex-row gap-2 text-sm`}>
            <span>Scraped: {job.productsScraped || 0}</span>
            <span>Saved: {job.productsSaved || 0}</span>
            <span>Updated: {job.productsUpdated || 0}</span>
            {job.duration && <span>Duration: {Math.round(job.duration / 1000)}s</span>}
          </div>

          {/* Show timing information if available */}
          {(job.startTime || job.endTime) && (
            <div className={styles.jobTiming}>
              {job.startTime && (
                <p className="text-sm text-(--text-primary)">
                  <span className=''>
                    Started:{" "}
                  </span>
                  {new Date(job.startTime).toLocaleString()}
                </p>
              )}
              {job.endTime && (
                <p className="text-sm text-(--text-primary)">
                  <span className=''>
                    Ended:{" "}
                  </span>
                  {new Date(job.endTime).toLocaleString()}
                </p>
              )}
            </div>
          )}

          {/* Show job ID for debugging */}
          <div className="">
            <span className="text-sm text-(--text-primary)">
              ID Job: {job.id}
            </span>
          </div>

          {/* Error message */}
          {job.errorMessage && (
            <div className={styles.jobError}>
              {job.errorMessage || "Error has not identified. Let screen system administrator"}
            </div>
          )}
        </div>
      </div>

      {/* Delete job Button */}
      <div className={styles.jobActions}>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleDeleteJob(job)}
          disabled={isDeletingJob}
          className={styles.activityDeleteButton}
        >
          <FontAwesomeIcon icon={faTrash} />
          {/* Delete */}
        </Button>
      </div>
    </div>
  )
}

export default JobCardItem

const getJobStatusDisplay = (job: ScrapeJob) => {
  const isSuccess = job.status === 'COMPLETED' && (job.productsSaved > 0 || job.productsUpdated > 0);
  const isError = job.status === 'FAILED' || (job.status === 'COMPLETED' && job.productsSaved === 0 && job.productsUpdated === 0);

  return {
    isSuccess,
    isError,
    icon: isSuccess ? faCheckCircle : isError ? faExclamationTriangle : faSpinner,
    color: isSuccess ? 'text-green-600' : isError ? 'text-red-600' : 'text-blue-600'
  };
};

