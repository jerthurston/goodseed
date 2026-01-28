import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faClock, faPlay, faRobot, faStop } from '@fortawesome/free-solid-svg-icons';
import { DashboardButton } from '@/app/dashboard/(components)/DashboardButton';
import { DashboardCard } from '@/app/dashboard/(components)/DashboardCard';
import styles from '@/app/dashboard/(components)/dashboardAdmin.module.css';
import ScheduleAutoScraperModal from '@/components/custom/modals/ScheduleAutoScraperModal';

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
            <div className="font-['Poppins'] font-semibold">
              ✅ Auto-Scrapers Active ({activeAutoScrapers} running)
            </div>
            <div
              className="text-sm mt-1 font-['Poppins']"
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
                    {activeSellers.length}
                  </span>
                </div>
              )
            }

            <FontAwesomeIcon icon={faPlay} className="mr-2" />
            RUN
            {hasScheduledJobs && (
              <span className="ml-2 text-xs bg-white/20 px-2 py-1 rounded">
                {activeAutoScrapers} Running
              </span>
            )}
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
            <FontAwesomeIcon icon={faStop} className="mr-2" />
            PAUSE
            {hasScheduledJobs && (
              <span className="ml-2 text-xs bg-white/20 px-2 py-1 rounded">
                {activeAutoScrapers}
              </span>
            )}
          </DashboardButton>
        </div>
        {lastRun && (
          <div className='text-center text-sm text-neutral-500 font-bold'>
          <FontAwesomeIcon icon={faClock} size='lg' className="mr-1 text-green-600" />
          <span>
            Last run: {lastRun?.toLocaleDateString()} at {lastRun?.toLocaleTimeString()}
            </span>
        </div>)}

       <div className='text-center text-sm text-neutral-500 font-bold'>
        <FontAwesomeIcon icon={faRobot} size='lg' className="mr-1 text-green-600" />
        <span>
          Auto scraper activity will happen at <span className='text-yellow-600'> 2.AM - 8.AM - 2.PM - 8.PM </span> everyday when RUN button is activated.
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
    </DashboardCard>
  )
}