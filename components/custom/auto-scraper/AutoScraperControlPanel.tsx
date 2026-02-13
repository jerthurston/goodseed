'use client';

import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faClock, faPlay, faRing, faRobot, faStop } from '@fortawesome/free-solid-svg-icons';
import { DashboardButton } from '@/app/dashboard/(components)/DashboardButton';
import { DashboardCard } from '@/app/dashboard/(components)/DashboardCard';
import styles from '@/app/dashboard/(components)/dashboardAdmin.module.css';
import ScheduleAutoScraperModal from '@/components/custom/modals/ScheduleAutoScraperModal';
import ScheduledTimesModal from '@/components/custom/modals/ScheduledTimesModal';

interface AutoScraperControlPanelProps {
  totalSellers: number;
  activeSellers: string[];
  activeAutoScrapers: number; // Number of currently scheduled auto-scrapers
  onBulkAction: (action: 'start' | 'stop', startTime?: Date) => void;
  isLoading: boolean;
  lastRun: Date | undefined;
}

export default function AutoScraperControlPanel({
  totalSellers,
  activeSellers,
  activeAutoScrapers,
  onBulkAction,
  isLoading,
  lastRun,
}: AutoScraperControlPanelProps) {
  // Modal state
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isScheduledTimesModalOpen, setIsScheduledTimesModalOpen] = useState(false);

  // Logic for button states
  const hasScheduledJobs = activeAutoScrapers > 0;
  const canStartAll = !hasScheduledJobs && !isLoading;
  const canStopAll = hasScheduledJobs && !isLoading;

  // Handle schedule confirmation
  const handleScheduleConfirm = (startTime: Date) => {
    setIsScheduleModalOpen(false);
    onBulkAction('start', startTime);
  };
  return (
    <DashboardCard className={styles.card}>
      <div className="space-y-6">
        <div className='flex flex-col justify-start'>
           <h3 
            className="text-xl font-bold"
            style={{ color: 'var(--text-primary)' }}
          >
          Bulk Scraper Control
          </h3>
          <p 
            className="text-sm font-['Poppins']"
            style={{ color: 'var(--text-primary-muted)' }}
          >
            Configure auto scraping for each seller individually. Enable auto scraping here to use the "Start All" feature above.
          </p>
         </div>
        {/* Status Info */}
        {hasScheduledJobs && (
          <div
            className="text-center p-3 rounded-lg border-2"
            style={{
              backgroundColor: 'var(--accent-cta)',
              borderColor: 'var(--border-color)',
              color: 'var(--text-primary)'
            }}
          >
            <div className="font-semibold">
              ✅ Auto-Scrapers Active ({activeAutoScrapers} running)
            </div>
            <div
              className="text-sm mt-1"
              style={{ color: 'var(--text-primary-muted)' }}
            >
              Auto-scrapers are scheduled and running. Use "Stop All" to clear and reschedule.
            </div>
          </div>
        )}

        {/* Bulk Actions */}
        <div className="flex gap-4 justify-center">
          <DashboardButton
            onClick={() => setIsScheduleModalOpen(true)}
            disabled={!canStartAll}
            variant="primary"
            className={`${styles.button} relative`}
            title={hasScheduledJobs
              ? `Auto-scrapers already running (${activeAutoScrapers}). Stop All first to reschedule.`
              : 'Schedule auto-scraping for all enabled sellers'
            }
          >
            {
              activeSellers.length > 0 && (
                <div className='absolute -right-2 -top-3 bg-red-400 text-white p-1 rounded-full w-6 h-6 flex items-center justify-center z-10'>
                  <span className='text-xs'>
                    {activeAutoScrapers}
                  </span>
                </div>
              )
            }

{!canStartAll ? <FontAwesomeIcon icon={faRobot} className="mr-2 animate-pulse" /> : <FontAwesomeIcon icon={faPlay} className="mr-2 " />}
            CRAWL
          </DashboardButton>

          <DashboardButton
            onClick={() => onBulkAction('stop')}
            disabled={!canStopAll}
            variant="danger"
            className={`${styles.button} flex flex-row items-center`}
            title={hasScheduledJobs
              ? `Stop ${activeAutoScrapers} running auto-scrapers`
              : 'No auto-scrapers currently running'
            }
          >
            <FontAwesomeIcon icon={faStop} className="mr-2 " />
            PAUSE
          </DashboardButton>
        </div>
        {/* {lastRun && (
          <div className='text-center text-sm text-neutral-500 font-bold'>
          <FontAwesomeIcon icon={faClock} size='lg' className="mr-1 text-green-600" />
          <span>
            Last run: {lastRun?.toLocaleDateString()} at {lastRun?.toLocaleTimeString()}
            </span>
        </div>)} */}

       <div className='text-center text-sm text-neutral-500 font-bold'>
        <FontAwesomeIcon icon={faRobot} size='lg' className="mr-1 text-green-600" />
        <span>
          Auto scraper activity will happen repeatedly at the
          <button
            onClick={() => setIsScheduledTimesModalOpen(true)}
            className='text-yellow-600 hover:text-yellow-500 underline cursor-pointer transition-colors mx-1'
            title="View scheduled run times for all sellers"
          >
            scheduled times.
          </button>
        </span>
       </div>
      </div>

      {/* Schedule Modal */}
      <ScheduleAutoScraperModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        onConfirm={handleScheduleConfirm}
        isLoading={isLoading}
        totalSellers={activeSellers.length}
      />

      {/* Scheduled Times Modal */}
      <ScheduledTimesModal
        isOpen={isScheduledTimesModalOpen}
        onClose={() => setIsScheduledTimesModalOpen(false)}
      />
    </DashboardCard>
  )
}