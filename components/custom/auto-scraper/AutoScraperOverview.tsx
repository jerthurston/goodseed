'use client'
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { DashboardCard, DashboardCardHeader } from '@/app/dashboard/(components)/DashboardCard';
import styles from '@/app/dashboard/(components)/dashboardAdmin.module.css';
import JobStatusCard from './JobStatusCard';
import AutoScraperStatusBadge from './AutoScraperStatusBadge';

// Use database ScrapeJobStatus enum values (sync with Bull Queue)
interface JobStatusCounts {
  CREATED: number;    // Job created in database, not yet in queue
  WAITING: number;    // Job in Bull queue, waiting to be processed
  DELAYED: number;    // Job scheduled for future execution (repeat jobs)
  ACTIVE: number;     // Job currently running
  COMPLETED: number;  // Job finished successfully
  FAILED: number;     // Job failed with error
  CANCELLED: number;  // Job manually cancelled or removed
  SCHEDULED: number;  // Auto-scraper repeat jobs (scheduled)
}

interface AutoScraperOverviewProps {
  stats?: {  // Make stats optional for error resilience
    totalSellers: number;
    jobCounts: JobStatusCounts;
    lastRun?: Date;
    nextScheduledRun?: Date;
    activeSellers: number; // Number of sellers with scheduled auto scraping
    summary?: {
      totalJobs: number;
      totalImmediateJobs: number;
      totalScheduledJobs: number;
      activeAutoScrapers: number;
      successRate: number;
    };
  };
  isLoading?: boolean;
  error?: string;
}

export default function AutoScraperOverview({ stats, isLoading = false, error }: AutoScraperOverviewProps) {
  // Defensive programming - provide default values for error resilience
  const { jobCounts = {
    CREATED: 0,
    WAITING: 0,
    DELAYED: 0,
    ACTIVE: 0,
    COMPLETED: 0,
    FAILED: 0,
    CANCELLED: 0,
    SCHEDULED: 0
  } } = stats || {};

  // Handle case where stats might be undefined/null
  const safeStats = {
    totalSellers: stats?.totalSellers || 0,
    activeSellers: stats?.activeSellers || 0,
    lastRun: stats?.lastRun,
    nextScheduledRun: stats?.nextScheduledRun
  };

  // Job Status Card Component
  const JobStatusCard = ({ 
    count, 
    label, 
    backgroundColor, 
    textColor = 'var(--text-primary)',
    size = 'large' 
  }: {
    count: number;
    label: string;
    backgroundColor: string;
    textColor?: string;
    size?: 'large' | 'small';
  }) => (
    <div 
      className={`text-center ${size === 'large' ? 'p-4' : 'p-3'}`}
      style={{ 
        backgroundColor,
        border: size === 'large' ? '3px solid var(--border-color)' : '2px solid var(--border-color)',
        boxShadow: size === 'large' ? '4px 4px 0 var(--border-color)' : undefined,
        borderRadius: size === 'small' ? '8px' : undefined
      }}
    >
      <div 
        className={`${size === 'large' ? 'text-2xl' : 'text-lg'} font-bold font-['Poppins']`}
        style={{ color: textColor }}
      >
        {count}
      </div>
      <div 
        className={`${size === 'large' ? 'text-sm' : 'text-xs'} font-['Poppins']`}
        style={{ color: textColor === 'var(--text-primary)' ? 'var(--text-primary-muted)' : textColor }}
      >
        {label}
      </div>
    </div>
  );

  // Job status configuration - representing job lifecycle progression
  const jobStatusesFlow = [
    {
      key: 'CREATED' as keyof JobStatusCounts,
      label: 'Created Jobs',
      backgroundColor: '#e5e7eb', // gray-200 - initial state
      textColor: 'var(--text-primary)',
      description: 'Jobs created in database'
    },
    {
      key: 'WAITING' as keyof JobStatusCounts,
      label: 'Waiting Jobs',
      backgroundColor: '#f59e0b', // amber-500 - in queue
      textColor: 'white',
      description: 'Jobs in Bull queue, waiting to be processed'
    },
    {
      key: 'SCHEDULED' as keyof JobStatusCounts,
      label: 'Auto-Scrapers',
      backgroundColor: 'var(--brand-primary)', // scheduled auto-scrapers
      textColor: 'var(--bg-main)',
      description: 'Active auto-scraper repeat jobs'
    },
    {
      key: 'DELAYED' as keyof JobStatusCounts,
      label: 'Delayed Jobs',
      backgroundColor: 'var(--accent-cta)', // scheduled state
      textColor: 'var(--text-primary)',
      description: 'Jobs scheduled for future execution'
    },
    {
      key: 'ACTIVE' as keyof JobStatusCounts,
      label: 'Running Jobs',
      backgroundColor: '#8b5cf6', // purple-500 - active execution
      textColor: 'white',
      description: 'Jobs currently running'
    },
    {
      key: 'COMPLETED' as keyof JobStatusCounts,
      label: 'Completed Jobs',
      backgroundColor: '#10b981', // green-500 - success
      textColor: 'white',
      description: 'Jobs finished successfully'
    },
    {
      key: 'FAILED' as keyof JobStatusCounts,
      label: 'Failed Jobs',
      backgroundColor: jobCounts.FAILED > 0 ? '#ef4444' : 'var(--bg-section)', // red-500 - error
      textColor: jobCounts.FAILED > 0 ? 'white' : 'var(--text-primary)',
      description: 'Jobs failed with error'
    },
    {
      key: 'CANCELLED' as keyof JobStatusCounts,
      label: 'Cancelled Jobs',
      backgroundColor: jobCounts.CANCELLED > 0 ? '#6b7280' : 'var(--bg-section)', // gray-500 - cancelled
      textColor: jobCounts.CANCELLED > 0 ? 'white' : 'var(--text-primary)',
      description: 'Jobs manually cancelled or removed'
    }
  ];

  // Summary stats configuration
  const summaryStats = [
    {
      count: safeStats.totalSellers,
      label: 'Total Sellers'
    },
    {
      count: stats?.summary?.totalJobs || Object.values(jobCounts).reduce((sum, count) => sum + count, 0),
      label: 'Total Jobs'
    },
    {
      count: jobCounts.SCHEDULED || safeStats.activeSellers,
      label: 'Active Auto-Scrapers'
    },
    {
      count: stats?.summary?.successRate || (jobCounts.COMPLETED + jobCounts.FAILED > 0 
        ? Math.round((jobCounts.COMPLETED / (jobCounts.COMPLETED + jobCounts.FAILED)) * 100)
        : 0),
      label: 'Success Rate',
      suffix: '%'
    }
  ];

  // Show error state
  if (error) {
    return (
      <DashboardCard className={styles.card}>
        <div className={styles.cardHeader}>
          <h3 
            className="text-lg font-semibold font-['Poppins']" 
            style={{ color: 'var(--text-primary)' }}
          >
            Auto Scraper Overview
          </h3>
        </div>
        <div className={styles.cardBody}>
          <div className="text-center p-8">
            <div 
              className="text-lg font-bold font-['Poppins'] mb-2"
              style={{ color: '#ef4444' }}
            >
              ⚠️ Unable to load data
            </div>
            <div 
              className="text-sm font-['Poppins']"
              style={{ color: 'var(--text-primary-muted)' }}
            >
              {error}
            </div>
            <button
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              onClick={() => window.location.reload()}
            >
              Retry
            </button>
          </div>
        </div>
      </DashboardCard>
    );
  }

  // Show loading state
  if (isLoading) {
    return (
      <DashboardCard className={styles.card}>
        <div className={styles.cardHeader}>
          <h3 
            className="text-lg font-semibold font-['Poppins']" 
            style={{ color: 'var(--text-primary)' }}
          >
            Auto Scraper Overview
          </h3>
        </div>
        <div className={styles.cardBody}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div 
                key={i}
                className="text-center p-4 animate-pulse"
                style={{ 
                  backgroundColor: 'var(--bg-section)',
                  border: '3px solid var(--border-color)',
                  boxShadow: '4px 4px 0 var(--border-color)'
                }}
              >
                <div className="w-8 h-8 bg-gray-300 rounded mb-2 mx-auto"></div>
                <div className="w-16 h-4 bg-gray-300 rounded mx-auto"></div>
              </div>
            ))}
          </div>
          <div className="text-center mt-4 text-sm text-gray-500">
            Loading auto scraper data...
          </div>
        </div>
      </DashboardCard>
    );
  }
  
  return (
    <DashboardCard className={styles.card}>
      <div className={styles.cardHeader}>
        <h3 
          className="text-lg font-semibold font-['Poppins']" 
          style={{ color: 'var(--text-primary)' }}
        >
          Auto Scraper Overview
        </h3>
      </div>
      
      <div className={styles.cardBody}>
        {/* Job Status Flow - Complete lifecycle progression */}
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
          {jobStatusesFlow.map((status, index) => (
            <JobStatusCard
              key={status.key}
              count={jobCounts[status.key]}
              label={status.label}
              backgroundColor={status.backgroundColor}
              textColor={status.textColor}
              size="large"
            />
          ))}
        </div>

        {/* Summary Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          {summaryStats.map((stat, index) => (
            <JobStatusCard
              key={stat.label}
              count={stat.count}
              label={stat.label}
              backgroundColor="var(--bg-section)"
              textColor="var(--text-primary)"
              size="small"
            />
          ))}
        </div>
        
        {/* Timing Information */}
        <div className="mt-4 space-y-2">
          {safeStats.lastRun && (
            <div 
              className="text-sm text-center font-['Poppins']"
              style={{ color: 'var(--text-primary-muted)' }}
            >
              Last run: {safeStats.lastRun.toLocaleDateString()} at {safeStats.lastRun.toLocaleTimeString()}
            </div>
          )}
          
          {safeStats.nextScheduledRun && (
            <div 
              className="text-sm text-center font-['Poppins']"
              style={{ color: 'var(--brand-primary)' }}
            >
              Next scheduled: {safeStats.nextScheduledRun.toLocaleDateString()} at {safeStats.nextScheduledRun.toLocaleTimeString()}
            </div>
          )}
        </div>
      </div>
    </DashboardCard>
  )
}