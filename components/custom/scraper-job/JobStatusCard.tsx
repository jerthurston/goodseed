'use client'

import React from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { 
  faSpinner, 
  faCheckCircle, 
  faTimesCircle, 
  faClock,
  faStop,
  faBox,
  faSave,
  faEdit,
  faExclamationTriangle,
  faChartLine
} from '@fortawesome/free-solid-svg-icons'
import { DashboardCard } from '@/app/dashboard/(components)/DashboardCard'
import { DashboardButton } from '@/app/dashboard/(components)/DashboardButton'
import styles from '@/app/dashboard/(components)/dashboardAdmin.module.css'

export interface JobStatusCardProps {
  jobId: string
  sellerId: string
  status: 'CREATED' | 'WAITING' | 'DELAYED' | 'ACTIVE' | 'COMPLETED' | 'FAILED' | 'CANCELLED'
  mode: string
  
  // Progress data
  currentPage?: number | null
  totalPages?: number | null
  productsScraped?: number
  productsSaved?: number
  productsUpdated?: number
  errors?: number
  
  // Timing
  startedAt?: Date | string | null
  completedAt?: Date | string | null
  duration?: number | null // milliseconds
  
  // Error details
  errorMessage?: string | null
  
  // Callbacks
  onStop?: () => void
  onViewDetails?: () => void
  
  // Loading states
  isStoppingJob?: boolean
}

/**
 * Real-time job status card component
 * Displays live progress, metrics, and controls for scraping jobs
 * Uses 5-second polling for active jobs
 */
export default function JobStatusCard({
  jobId,
  sellerId,
  status,
  mode,
  currentPage,
  totalPages,
  productsScraped = 0,
  productsSaved = 0,
  productsUpdated = 0,
  errors = 0,
  startedAt,
  completedAt,
  duration,
  errorMessage,
  onStop,
  onViewDetails,
  isStoppingJob = false
}: JobStatusCardProps) {
  
  // Calculate progress percentage
  const progressPercentage = totalPages && currentPage 
    ? Math.min(Math.round((currentPage / totalPages) * 100), 100)
    : 0

  // Calculate elapsed time
  const getElapsedTime = () => {
    if (!startedAt) return null
    
    const start = new Date(startedAt).getTime()
    const end = completedAt ? new Date(completedAt).getTime() : Date.now()
    const elapsed = end - start
    
    const seconds = Math.floor(elapsed / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`
    } else {
      return `${seconds}s`
    }
  }

  // Get status config
  const getStatusConfig = () => {
    switch (status) {
      case 'ACTIVE':
        return {
          icon: faSpinner,
          label: 'Running',
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          animate: 'animate-spin'
        }
      case 'COMPLETED':
        return {
          icon: faCheckCircle,
          label: 'Completed',
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          animate: ''
        }
      case 'FAILED':
        return {
          icon: faTimesCircle,
          label: 'Failed',
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          animate: ''
        }
      case 'CANCELLED':
        return {
          icon: faTimesCircle,
          label: 'Cancelled',
          color: 'text-orange-600',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200',
          animate: ''
        }
      case 'WAITING':
      case 'DELAYED':
        return {
          icon: faClock,
          label: 'Waiting',
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          animate: ''
        }
      default:
        return {
          icon: faClock,
          label: 'Created',
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          animate: ''
        }
    }
  }

  const statusConfig = getStatusConfig()
  const elapsedTime = getElapsedTime()
  const isActive = status === 'ACTIVE'
  const isFinished = ['COMPLETED', 'FAILED', 'CANCELLED'].includes(status)

  return (
    <DashboardCard>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b-2 border-(--border-color)">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${statusConfig.bgColor} ${statusConfig.borderColor} border-2`}>
            <FontAwesomeIcon 
              icon={statusConfig.icon} 
              className={`text-xl ${statusConfig.color} ${statusConfig.animate}`}
            />
          </div>
          <div>
            <h3 className="font-['Archivo_Black'] text-lg text-(--text-primary) uppercase">
              Scrape Job Status
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-sm font-semibold ${statusConfig.color}`}>
                {statusConfig.label}
              </span>
              <span className="text-xs text-(--text-primary-muted)">
                #{jobId.slice(0, 8)}
              </span>
              <span className="text-xs text-(--text-primary-muted) uppercase">
                • {mode}
              </span>
            </div>
          </div>
        </div>
        
        {/* Actions */}
        {isActive && onStop && (
          <DashboardButton
            variant="danger"
            onClick={onStop}
            disabled={isStoppingJob}
            className="flex items-center gap-2"
          >
            {isStoppingJob ? (
              <>
                <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent" />
                Stopping...
              </>
            ) : (
              <>
                <FontAwesomeIcon icon={faStop} className="h-3 w-3" />
                Stop Job
              </>
            )}
          </DashboardButton>
        )}
      </div>

      {/* Progress Bar */}
      {(isActive || isFinished) && totalPages && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-(--text-primary)">
              Page Progress
            </span>
            <span className="text-sm font-semibold text-(--brand-primary)">
              {currentPage || 0} / {totalPages} ({progressPercentage}%)
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div 
              className={`h-3 rounded-full transition-all duration-500 ${
                isActive ? 'bg-blue-500' : 
                status === 'COMPLETED' ? 'bg-green-500' : 
                'bg-red-500'
              }`}
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {/* Products Scraped */}
        <div className="bg-(--bg-section) p-3 rounded-lg border-2 border-(--border-color)">
          <div className="flex items-center gap-2 mb-1">
            <FontAwesomeIcon icon={faBox} className="text-blue-500 h-4 w-4" />
            <span className="text-xs text-(--text-primary-muted) uppercase font-medium">
              Scraped
            </span>
          </div>
          <p className="font-['Archivo_Black'] text-2xl text-(--brand-primary)">
            {productsScraped}
          </p>
        </div>

        {/* Products Saved */}
        <div className="bg-(--bg-section) p-3 rounded-lg border-2 border-(--border-color)">
          <div className="flex items-center gap-2 mb-1">
            <FontAwesomeIcon icon={faSave} className="text-green-500 h-4 w-4" />
            <span className="text-xs text-(--text-primary-muted) uppercase font-medium">
              Saved
            </span>
          </div>
          <p className="font-['Archivo_Black'] text-2xl text-green-600">
            {productsSaved}
          </p>
        </div>

        {/* Products Updated */}
        <div className="bg-(--bg-section) p-3 rounded-lg border-2 border-(--border-color)">
          <div className="flex items-center gap-2 mb-1">
            <FontAwesomeIcon icon={faEdit} className="text-yellow-500 h-4 w-4" />
            <span className="text-xs text-(--text-primary-muted) uppercase font-medium">
              Updated
            </span>
          </div>
          <p className="font-['Archivo_Black'] text-2xl text-yellow-600">
            {productsUpdated}
          </p>
        </div>

        {/* Errors */}
        <div className="bg-(--bg-section) p-3 rounded-lg border-2 border-(--border-color)">
          <div className="flex items-center gap-2 mb-1">
            <FontAwesomeIcon icon={faExclamationTriangle} className="text-red-500 h-4 w-4" />
            <span className="text-xs text-(--text-primary-muted) uppercase font-medium">
              Errors
            </span>
          </div>
          <p className="font-['Archivo_Black'] text-2xl text-red-600">
            {errors}
          </p>
        </div>
      </div>

      {/* Timing Info */}
      {elapsedTime && (
        <div className="flex items-center justify-between p-3 bg-(--bg-section) rounded-lg border-2 border-(--border-color) mb-4">
          <div className="flex items-center gap-2">
            <FontAwesomeIcon icon={faClock} className="text-(--text-primary-muted)" />
            <span className="text-sm text-(--text-primary-muted)">
              {isActive ? 'Running for' : 'Duration'}:
            </span>
          </div>
          <span className="text-sm font-semibold text-(--text-primary)">
            {elapsedTime}
          </span>
        </div>
      )}

      {/* Error Message */}
      {status === 'FAILED' && errorMessage && (
        <div className="p-3 bg-red-50 border-2 border-red-200 rounded-lg mb-4">
          <div className="flex items-start gap-2">
            <FontAwesomeIcon icon={faTimesCircle} className="text-red-500 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-700 mb-1">
                Error Details
              </p>
              <p className="text-xs text-red-600">
                {errorMessage}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* View Details Button */}
      {onViewDetails && (
        <div className="pt-3 border-t-2 border-(--border-color)">
          <DashboardButton
            variant="outline"
            onClick={onViewDetails}
            className="w-full flex items-center justify-center gap-2"
          >
            <FontAwesomeIcon icon={faChartLine} className="h-3 w-3" />
            View Detailed Logs
          </DashboardButton>
        </div>
      )}

      {/* Live Update Indicator */}
      {isActive && (
        <div className="mt-3 flex items-center justify-center gap-2 text-xs text-blue-500">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          <span>Live updates every 5 seconds</span>
        </div>
      )}
    </DashboardCard>
  )
}
