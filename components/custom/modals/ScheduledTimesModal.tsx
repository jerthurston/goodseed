'use client';

import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faClock, faCalendar, faSpinner, faExclamationCircle, faTimes } from '@fortawesome/free-solid-svg-icons';
import { formatToCanadaTime, convertCronToCanada, getRelativeTime } from '@/lib/utils/timezone';
import { apiLogger } from '@/lib/helpers/api-logger';

interface ScheduledJob {
  id: string;
  cron: string;
  next: number;
  tz: string | null;
  key: string;
}

interface ScheduledTimesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ScheduledTimesModal({
  isOpen,
  onClose,
}: ScheduledTimesModalProps) {
  const [scheduledJobs, setScheduledJobs] = useState<ScheduledJob[]>([]);
  const [sellers, setSellers] = useState<Record<string, { id: string; name: string }>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Prevent background scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Fetch scheduled jobs and seller info when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchScheduledTimes();
    }
  }, [isOpen]);

  const fetchScheduledTimes = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Fetch scheduled jobs from queue
      const queueResponse = await fetch('/api/debug/queue');
      const queueData = await queueResponse.json();
      
      if (!queueData.success) {
        throw new Error('Failed to fetch scheduled jobs');
      }

      const jobs = queueData.data?.scheduledJobs?.jobs || [];
      setScheduledJobs(jobs);

      // Extract seller IDs from job IDs
      const sellerIds = jobs.map((job: ScheduledJob) => 
        job.id.replace('auto_scrape_', '')
      );

      apiLogger.info('[ScheduledTimesModal] Extracted seller IDs', { sellerIds });

      // Fetch seller info
      const sellerResponse = await fetch('/api/admin/sellers');
      const sellerData = await sellerResponse.json();
      
      apiLogger.info('[ScheduledTimesModal] Seller API response', { 
        success: sellerData.success,
        dataLength: sellerData.data?.length,
        firstSeller: sellerData.data?.[0]
      });
      
      if (sellerData.success && sellerData.data) {
        const sellerMap: Record<string, { id: string; name: string }> = {};
        sellerData.data.forEach((seller: any) => {
          sellerMap[seller.id] = { id: seller.id, name: seller.name };
        });
        setSellers(sellerMap);
        apiLogger.info('[ScheduledTimesModal] Seller map created', { 
          sellerMapKeys: Object.keys(sellerMap),
          sellerMapValues: Object.values(sellerMap)
        });
      } else {
        apiLogger.warn('[ScheduledTimesModal] Seller API returned no data', sellerData);
      }

      apiLogger.info('[ScheduledTimesModal] Fetched scheduled times', { 
        jobCount: jobs.length 
      });
    } catch (error) {
      apiLogger.logError('[ScheduledTimesModal] Failed to fetch', error as Error);
      setError('Failed to load scheduled times. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Group jobs by next run time
  const groupJobsByTime = () => {
    const grouped: Record<string, ScheduledJob[]> = {};
    
    scheduledJobs.forEach(job => {
      const nextRun = formatToCanadaTime(job.next);
      if (!grouped[nextRun]) {
        grouped[nextRun] = [];
      }
      grouped[nextRun].push(job);
    });

    return Object.entries(grouped).sort(([timeA], [timeB]) => {
      const dateA = new Date(scheduledJobs.find(j => formatToCanadaTime(j.next) === timeA)?.next || 0);
      const dateB = new Date(scheduledJobs.find(j => formatToCanadaTime(j.next) === timeB)?.next || 0);
      return dateA.getTime() - dateB.getTime();
    });
  };

  // Parse cron pattern
  const parseCronPattern = (cron: string) => {
    const parts = cron.split(' ');
    const [minute, hour] = parts;
    return convertCronToCanada(parseInt(hour), parseInt(minute));
  };

  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(59, 74, 63, 0.95)' }}
          onClick={onClose}
        >
          <div 
            className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto border-[6px] shadow-[12px_12px_0_var(--border-color)]"
            style={{ 
              backgroundColor: 'var(--bg-main)',
              borderColor: 'var(--border-color)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-8 text-center border-b-[3px]" style={{ borderColor: 'var(--border-color)' }}>
              <button
                onClick={onClose}
                className="absolute top-3 right-3 text-3xl font-bold leading-none p-1 transition-colors"
                style={{ color: 'var(--text-primary)' }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--brand-primary)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
                aria-label="Close modal"
              >
                ×
              </button>
              <h2 
                className="text-4xl font-black uppercase mb-2 tracking-tight"
                style={{ 
                  fontFamily: 'Archivo Black, sans-serif',
                  color: 'var(--brand-primary)',
                  letterSpacing: '-1px'
                }}
              >
                <FontAwesomeIcon icon={faCalendar} className="mr-2" />
                Scheduled Timeline
              </h2>
              <p 
                className="text-base leading-relaxed"
                style={{ 
                  fontFamily: 'Poppins, sans-serif',
                  color: 'var(--text-primary)'
                }}
              >
                View the upcoming schedule for all auto-scraper jobs. Times are displayed in Canada timezone.
              </p>
            </div>

            {/* Content */}
            <div className="p-8">
              {isLoading && (
                <div className="flex flex-col items-center justify-center py-12">
                  <FontAwesomeIcon 
                    icon={faSpinner} 
                    className="text-5xl mb-4 animate-spin"
                    style={{ color: 'var(--brand-primary)' }}
                  />
                  <p style={{ color: 'var(--text-primary)', fontFamily: 'Poppins, sans-serif' }}>
                    Loading scheduled times...
                  </p>
                </div>
              )}

              {error && (
                <div 
                  className="p-4 border-2 flex items-start gap-3"
                  style={{ 
                    backgroundColor: '#fee', 
                    borderColor: '#fcc'
                  }}
                >
                  <FontAwesomeIcon icon={faExclamationCircle} className="text-xl mt-1" style={{ color: '#c00' }} />
                  <div>
                    <div className="font-semibold" style={{ color: '#c00' }}>Error</div>
                    <div className="text-sm" style={{ color: '#900' }}>{error}</div>
                  </div>
                </div>
              )}

              {!isLoading && !error && scheduledJobs.length === 0 && (
                <div className="text-center py-12" style={{ color: 'var(--text-primary-muted)' }}>
                  <FontAwesomeIcon icon={faCalendar} className="text-5xl mb-4 opacity-50" />
                  <div className="text-lg font-semibold mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
                    No Scheduled Jobs
                  </div>
                  <div className="text-sm" style={{ fontFamily: 'Poppins, sans-serif' }}>
                    Click "CRAWL" to schedule auto-scraper jobs for your sellers.
                  </div>
                </div>
              )}

              {!isLoading && !error && scheduledJobs.length > 0 && (
                <div className="space-y-6">
                  {/* Summary Stats */}
                  <div className="grid grid-cols-3 gap-4">
                    <div 
                      className="p-4 border-[3px]"
                      style={{ 
                        backgroundColor: 'var(--bg-section)',
                        borderColor: 'var(--border-color)'
                      }}
                    >
                      <div 
                        className="text-sm"
                        style={{ 
                          fontFamily: 'Poppins, sans-serif',
                          color: 'var(--text-primary-muted)' 
                        }}
                      >
                        Total Scheduled
                      </div>
                      <div 
                        className="text-2xl font-bold mt-1"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {scheduledJobs.length}
                      </div>
                    </div>

                    <div 
                      className="p-4 border-[3px]"
                      style={{ 
                        backgroundColor: 'var(--bg-section)',
                        borderColor: 'var(--border-color)'
                      }}
                    >
                      <div 
                        className="text-sm"
                        style={{ 
                          fontFamily: 'Poppins, sans-serif',
                          color: 'var(--text-primary-muted)' 
                        }}
                      >
                        Next Run
                      </div>
                      <div 
                        className="text-xl font-bold mt-1"
                        style={{ color: 'var(--brand-primary)' }}
                      >
                        {scheduledJobs[0] ? getRelativeTime(scheduledJobs[0].next) : 'N/A'}
                      </div>
                    </div>

                    <div 
                      className="p-4 border-[3px]"
                      style={{ 
                        backgroundColor: 'var(--bg-section)',
                        borderColor: 'var(--border-color)'
                      }}
                    >
                      <div 
                        className="text-sm"
                        style={{ 
                          fontFamily: 'Poppins, sans-serif',
                          color: 'var(--text-primary-muted)' 
                        }}
                      >
                        Schedule
                      </div>
                      <div 
                        className="text-lg font-bold mt-1"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {scheduledJobs[0] ? parseCronPattern(scheduledJobs[0].cron).formatted : 'N/A'}
                      </div>
                    </div>
                  </div>

                  {/* Timeline */}
                  <div>
                    <h3 
                      className="text-xl font-bold mb-4 flex items-center gap-2 uppercase"
                      style={{ 
                        color: 'var(--brand-primary)',
                        fontFamily: 'Poppins, sans-serif'
                      }}
                    >
                      <FontAwesomeIcon icon={faClock} />
                      Schedule Timeline
                    </h3>

                    <div className="relative">
                      {/* Timeline line */}
                      <div 
                        className="absolute left-8 top-0 bottom-0 w-0.5"
                        style={{ backgroundColor: 'var(--border-color)', opacity: 0.3 }}
                      />

                      {/* Timeline items */}
                      <div className="space-y-6">
                        {groupJobsByTime().map(([timeString, jobs], index) => {
                          const firstJob = jobs[0];
                          const cronInfo = parseCronPattern(firstJob.cron);
                          
                          return (
                            <div key={timeString} className="relative pl-16">
                              {/* Timeline dot */}
                              <div 
                                className="absolute left-6 top-2 w-5 h-5 rounded-full border-4 z-10"
                                style={{
                                  backgroundColor: index === 0 ? 'var(--brand-primary)' : 'var(--bg-main)',
                                  borderColor: index === 0 ? 'var(--brand-primary)' : 'var(--border-color)'
                                }}
                              />

                              {/* Content card */}
                              <div 
                                className="p-4 border-[3px]"
                                style={{
                                  backgroundColor: index === 0 ? 'var(--accent-cta)' : 'var(--bg-section)',
                                  borderColor: index === 0 ? 'var(--brand-primary)' : 'var(--border-color)'
                                }}
                              >
                                {/* Time header */}
                                <div className="flex items-center justify-between mb-3">
                                  <div>
                                    <div 
                                      className="font-bold text-lg"
                                      style={{
                                        color: index === 0 ? 'var(--brand-primary)' : 'var(--text-primary)',
                                        fontFamily: 'Poppins, sans-serif'
                                      }}
                                    >
                                      {cronInfo.formatted}
                                    </div>
                                    <div 
                                      className="text-sm mt-1"
                                      style={{ 
                                        fontFamily: 'Poppins, sans-serif',
                                        color: 'var(--text-primary-muted)' 
                                      }}
                                    >
                                      {getRelativeTime(firstJob.next)}
                                    </div>
                                  </div>
                                  <div 
                                    className="px-3 py-1 text-sm font-semibold border-[3px]"
                                    style={{
                                      backgroundColor: index === 0 ? 'var(--brand-primary)' : 'var(--bg-main)',
                                      color: index === 0 ? 'var(--bg-main)' : 'var(--text-primary)',
                                      borderColor: 'var(--border-color)',
                                      fontFamily: 'Poppins, sans-serif'
                                    }}
                                  >
                                    {jobs.length} seller{jobs.length > 1 ? 's' : ''}
                                  </div>
                                </div>

                                {/* Seller list */}
                                <div className="max-h-32 overflow-y-auto">
                                  <ul className="space-y-1">
                                    {jobs.map((job) => {
                                      const sellerId = job.id.replace('auto_scrape_', '');
                                      const seller = sellers[sellerId];
                                      
                                      return (
                                        <li 
                                          key={job.id}
                                          className="flex items-center gap-2"
                                        >
                                          <div 
                                            className="w-1.5 h-1.5 rounded-full shrink-0"
                                            style={{ backgroundColor: 'var(--brand-primary)' }}
                                          />
                                          <p 
                                            className="text-sm"
                                            style={{ 
                                              color: 'var(--text-primary)',
                                              fontFamily: 'Poppins, sans-serif'
                                            }}
                                          >
                                            {seller?.name || `Seller ${sellerId}`}
                                          </p>
                                        </li>
                                      );
                                    })}
                                  </ul>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Footer info */}
                  <div 
                    className="p-4 border-[3px] text-sm leading-relaxed"
                    style={{ 
                      backgroundColor: 'var(--bg-section)',
                      borderColor: 'var(--border-color)',
                      color: 'var(--text-primary)',
                      fontFamily: 'Poppins, sans-serif'
                    }}
                  >
                    <strong>Note:</strong> Jobs run sequentially (one at a time). Each seller may take 3-6 hours to complete.
                    Total estimated time: {Math.round(scheduledJobs.length * 4.5)} hours.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
