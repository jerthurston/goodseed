'use client'

import React, { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faClipboardList,
  faCheckCircle,
  faTimesCircle,
  faSpinner,
  faClock,
  faRobot,
  faUser,
  faFilter,
  faSearch,
  faChevronLeft,
  faChevronRight,
  faBox,
  faSave,
  faEdit,
  faExclamationTriangle,
  faTools
} from '@fortawesome/free-solid-svg-icons'
import { DashboardCard } from '@/app/dashboard/(components)/DashboardCard'
import { DashboardButton } from '@/app/dashboard/(components)/DashboardButton'
import styles from '@/app/dashboard/(components)/dashboardAdmin.module.css'
import { useFetchScrapeJobs, type ScrapeJob } from '@/hooks/admin/scrape-job'

interface JobHistoryTableProps {
  sellerId?: string // Optional: filter by seller
  limit?: number
  showFilters?: boolean
}

/**
 * Enhanced Job History Table with filters and pagination
 */
export default function JobHistoryTable({
  sellerId,
  limit = 50,
  showFilters = true
}: JobHistoryTableProps) {
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState<'COMPLETED' | 'FAILED' | 'ALL'>('ALL')
  const [modeFilter, setModeFilter] = useState<'manual' | 'batch' | 'auto' | 'test' | 'ALL'>('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  // Fetch jobs with filters
  const { jobs, isLoading, error, refreshJobs } = useFetchScrapeJobs({
    status: statusFilter,
    mode: modeFilter,
    sellerId,
    limit,
    timeframe: undefined // Get all jobs
  })

  // Client-side search filtering
  const filteredJobs = jobs.filter(job => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      job.id.toLowerCase().includes(query) ||
      job.jobId?.toLowerCase().includes(query) ||
      job.seller.name?.toLowerCase().includes(query)
    )
  })

  // Status badge helper
  const getStatusBadge = (status: ScrapeJob['status']) => {
    const configs = {
      ACTIVE: { icon: faSpinner, color: 'text-blue-600', bg: 'bg-blue-50', label: 'Running', animate: 'animate-spin' },
      COMPLETED: { icon: faCheckCircle, color: 'text-green-600', bg: 'bg-green-50', label: 'Completed', animate: '' },
      FAILED: { icon: faTimesCircle, color: 'text-red-600', bg: 'bg-red-50', label: 'Failed', animate: '' },
      CANCELLED: { icon: faTimesCircle, color: 'text-orange-600', bg: 'bg-orange-50', label: 'Cancelled', animate: '' },
      WAITING: { icon: faClock, color: 'text-yellow-600', bg: 'bg-yellow-50', label: 'Waiting', animate: '' },
      DELAYED: { icon: faClock, color: 'text-yellow-600', bg: 'bg-yellow-50', label: 'Delayed', animate: '' },
      CREATED: { icon: faClock, color: 'text-gray-600', bg: 'bg-gray-50', label: 'Created', animate: '' }
    }
    const config = configs[status] || configs.CREATED
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.color}`}>
        <FontAwesomeIcon icon={config.icon} className={config.animate} />
        {config.label}
      </span>
    )
  }

  // Mode badge helper
  const getModeBadge = (mode: string) => {
    const configs = {
      auto: { icon: faRobot, color: 'text-blue-600', bg: 'bg-blue-50' },
      manual: { icon: faUser, color: 'text-purple-600', bg: 'bg-purple-50' },
      test: { icon: faTools, color: 'text-orange-600', bg: 'bg-orange-50' },
      batch: { icon: faBox, color: 'text-gray-600', bg: 'bg-gray-50' }
    }
    const config = configs[mode as keyof typeof configs] || configs.manual
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${config.bg} ${config.color}`}>
        <FontAwesomeIcon icon={config.icon} className="h-3 w-3" />
        {mode.toUpperCase()}
      </span>
    )
  }

  // Format date
  const formatDate = (date: Date | string) => {
    const d = new Date(date)
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Format duration
  const formatDuration = (ms: number | null | undefined) => {
    if (!ms) return 'N/A'
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`
    }
    return `${seconds}s`
  }

  return (
    <DashboardCard>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b-2 border-(--border-color)">
        <div className="flex items-center gap-3">
          <FontAwesomeIcon icon={faClipboardList} className="text-xl text-(--brand-primary)" />
          <div>
            <h2 className="font-['Archivo_Black'] text-xl uppercase text-(--text-primary)">
              Job History
            </h2>
            <p className="text-sm text-(--text-primary-muted)">
              {sellerId ? 'Seller job history' : 'All scraping jobs'} ({filteredJobs.length} jobs)
            </p>
          </div>
        </div>
        <DashboardButton
          variant="outline"
          onClick={refreshJobs}
          className="flex items-center gap-2"
        >
          <FontAwesomeIcon icon={faSpinner} className="h-3 w-3" />
          Refresh
        </DashboardButton>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="mb-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-(--text-primary) mb-2">
                <FontAwesomeIcon icon={faFilter} className="mr-2" />
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full px-3 py-2 border-2 border-(--border-color) rounded-lg bg-(--bg-section) text-(--text-primary) focus:outline-none focus:border-(--brand-primary)"
              >
                <option value="ALL">All Statuses</option>
                <option value="COMPLETED">Completed</option>
                <option value="FAILED">Failed</option>
              </select>
            </div>

            {/* Mode Filter */}
            <div>
              <label className="block text-sm font-medium text-(--text-primary) mb-2">
                <FontAwesomeIcon icon={faFilter} className="mr-2" />
                Mode
              </label>
              <select
                value={modeFilter}
                onChange={(e) => setModeFilter(e.target.value as any)}
                className="w-full px-3 py-2 border-2 border-(--border-color) rounded-lg bg-(--bg-section) text-(--text-primary) focus:outline-none focus:border-(--brand-primary)"
              >
                <option value="ALL">All Modes</option>
                <option value="auto">Auto</option>
                <option value="manual">Manual</option>
                <option value="test">Test</option>
                <option value="batch">Batch</option>
              </select>
            </div>

            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-(--text-primary) mb-2">
                <FontAwesomeIcon icon={faSearch} className="mr-2" />
                Search
              </label>
              <input
                type="text"
                placeholder="Job ID or Seller..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 border-2 border-(--border-color) rounded-lg bg-(--bg-section) text-(--text-primary) focus:outline-none focus:border-(--brand-primary)"
              />
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-(--brand-primary) border-t-transparent"></div>
            <span className="text-(--text-primary-muted)">Loading job history...</span>
          </div>
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <FontAwesomeIcon icon={faTimesCircle} className="text-red-500 text-3xl mb-3" />
          <p className="text-(--text-primary-muted) mb-2">Failed to load job history</p>
          <p className="text-sm text-red-600">{error}</p>
        </div>
      ) : filteredJobs.length === 0 ? (
        <div className="text-center py-12">
          <FontAwesomeIcon icon={faClipboardList} className="text-(--text-primary-muted) text-3xl mb-3" />
          <p className="text-(--text-primary-muted) font-medium">No jobs found</p>
          <p className="text-sm text-(--text-primary-muted) mt-1">
            Try adjusting your filters or start a new scrape
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-(--border-color)">
                <th className="text-left py-3 px-4 text-sm font-semibold text-(--text-primary) uppercase">Status</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-(--text-primary) uppercase">Mode</th>
                {!sellerId && (
                  <th className="text-left py-3 px-4 text-sm font-semibold text-(--text-primary) uppercase">Seller</th>
                )}
                <th className="text-left py-3 px-4 text-sm font-semibold text-(--text-primary) uppercase">Job ID</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-(--text-primary) uppercase">Scraped</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-(--text-primary) uppercase">Saved</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-(--text-primary) uppercase">Updated</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-(--text-primary) uppercase">Errors</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-(--text-primary) uppercase">Duration</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-(--text-primary) uppercase">Created</th>
              </tr>
            </thead>
            <tbody>
              {filteredJobs.map((job) => (
                <tr 
                  key={job.id}
                  className="border-b border-(--border-color) hover:bg-(--bg-section) transition-colors"
                >
                  <td className="py-3 px-4">
                    {getStatusBadge(job.status)}
                  </td>
                  <td className="py-3 px-4">
                    {getModeBadge(job.mode)}
                  </td>
                  {!sellerId && (
                    <td className="py-3 px-4 text-sm text-(--text-primary)">
                      {job.seller.name || 'Unknown'}
                    </td>
                  )}
                  <td className="py-3 px-4 text-xs font-mono text-(--text-primary-muted)">
                    #{job.jobId?.slice(0, 8) || job.id.slice(0, 8)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600">
                      <FontAwesomeIcon icon={faBox} className="h-3 w-3" />
                      {job.productsScraped}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="inline-flex items-center gap-1 text-sm font-semibold text-green-600">
                      <FontAwesomeIcon icon={faSave} className="h-3 w-3" />
                      {job.productsSaved}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="inline-flex items-center gap-1 text-sm font-semibold text-yellow-600">
                      <FontAwesomeIcon icon={faEdit} className="h-3 w-3" />
                      {job.productsUpdated}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`inline-flex items-center gap-1 text-sm font-semibold ${
                      job.errors > 0 ? 'text-red-600' : 'text-gray-400'
                    }`}>
                      <FontAwesomeIcon icon={faExclamationTriangle} className="h-3 w-3" />
                      {job.errors}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-(--text-primary-muted)">
                    {formatDuration(job.duration)}
                  </td>
                  <td className="py-3 px-4 text-sm text-(--text-primary-muted)">
                    {formatDate(job.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Summary Footer */}
      {filteredJobs.length > 0 && (
        <div className="mt-6 pt-4 border-t-2 border-(--border-color)">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-(--brand-primary)">
                {filteredJobs.reduce((sum, job) => sum + job.productsScraped, 0)}
              </p>
              <p className="text-xs text-(--text-primary-muted) uppercase">Total Scraped</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">
                {filteredJobs.reduce((sum, job) => sum + job.productsSaved, 0)}
              </p>
              <p className="text-xs text-(--text-primary-muted) uppercase">Total Saved</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-yellow-600">
                {filteredJobs.reduce((sum, job) => sum + job.productsUpdated, 0)}
              </p>
              <p className="text-xs text-(--text-primary-muted) uppercase">Total Updated</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">
                {filteredJobs.reduce((sum, job) => sum + job.errors, 0)}
              </p>
              <p className="text-xs text-(--text-primary-muted) uppercase">Total Errors</p>
            </div>
          </div>
        </div>
      )}
    </DashboardCard>
  )
}
