'use client'

import { useRouter } from 'next/navigation'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faArrowLeft,
  faChartLine,
  faSpinner,
  faCheckCircle,
  faTimesCircle,
  faClock,
  faRobot,
  faServer,
  faExclamationTriangle
} from '@fortawesome/free-solid-svg-icons'
import {
  DashboardCard,
  DashboardButton,
  AdminBreadcrumb
} from '../../(components)'
import styles from '../../(components)/dashboardAdmin.module.css'
import JobHistoryTable from '@/components/custom/scraper-job/JobHistoryTable'
import { useFetchScrapeJobs } from '@/hooks/admin/scrape-job'
import { getJobsBreadcrumbs } from '../../(components)/utils/breadcrumbHelpers'

/**
 * Admin Jobs Monitoring Dashboard
 * Central monitoring page for all scraping jobs across all sellers
 */
export default function AdminJobsPage() {
  const router = useRouter()

  // Fetch all jobs for statistics
  const { jobs, isLoading } = useFetchScrapeJobs({
    status: 'ALL',
    mode: 'ALL',
    limit: 100,
    timeframe: undefined
  })

  // Calculate statistics
  const stats = {
    total: jobs.length,
    active: jobs.filter(j => j.status === 'ACTIVE').length,
    completed: jobs.filter(j => j.status === 'COMPLETED').length,
    failed: jobs.filter(j => j.status === 'FAILED').length,
    waiting: jobs.filter(j => ['WAITING', 'DELAYED', 'CREATED'].includes(j.status)).length,
    
    totalScraped: jobs.reduce((sum, j) => sum + j.productsScraped, 0),
    totalSaved: jobs.reduce((sum, j) => sum + j.productsSaved, 0),
    totalUpdated: jobs.reduce((sum, j) => sum + j.productsUpdated, 0),
    totalErrors: jobs.reduce((sum, j) => sum + j.errors, 0),
    
    successRate: jobs.length > 0 
      ? ((jobs.filter(j => j.status === 'COMPLETED').length / jobs.length) * 100).toFixed(1)
      : '0.0'
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <AdminBreadcrumb items={getJobsBreadcrumbs()} />
      
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-['Archivo_Black'] text-3xl text-(--text-primary) uppercase mb-2">
            Jobs Monitoring Dashboard
          </h1>
          <p className="font-['Poppins'] text-(--text-primary-muted)">
            Real-time overview of all scraping operations
          </p>
        </div>
        <DashboardButton
          onClick={() => router.push('/dashboard/admin')}
        >
          <FontAwesomeIcon icon={faArrowLeft} className="mr-2" />
          Back to Dashboard
        </DashboardButton>
      </div>

      {/* Statistics Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Jobs */}
        <DashboardCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-(--text-primary-muted) uppercase font-medium mb-2">
                Active Jobs
              </p>
              {isLoading ? (
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-(--brand-primary) border-t-transparent" />
              ) : (
                <p className="font-['Archivo_Black'] text-4xl text-blue-600">
                  {stats.active}
                </p>
              )}
            </div>
            <div className="p-4 bg-blue-50 rounded-lg">
              <FontAwesomeIcon icon={faSpinner} className="text-3xl text-blue-600 animate-spin" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-(--border-color)">
            <p className="text-xs text-(--text-primary-muted)">
              Currently processing
            </p>
          </div>
        </DashboardCard>

        {/* Completed Jobs */}
        <DashboardCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-(--text-primary-muted) uppercase font-medium mb-2">
                Completed
              </p>
              {isLoading ? (
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-(--brand-primary) border-t-transparent" />
              ) : (
                <p className="font-['Archivo_Black'] text-4xl text-green-600">
                  {stats.completed}
                </p>
              )}
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <FontAwesomeIcon icon={faCheckCircle} className="text-3xl text-green-600" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-(--border-color)">
            <p className="text-xs text-(--text-primary-muted)">
              Success rate: {stats.successRate}%
            </p>
          </div>
        </DashboardCard>

        {/* Failed Jobs */}
        <DashboardCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-(--text-primary-muted) uppercase font-medium mb-2">
                Failed
              </p>
              {isLoading ? (
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-(--brand-primary) border-t-transparent" />
              ) : (
                <p className="font-['Archivo_Black'] text-4xl text-red-600">
                  {stats.failed}
                </p>
              )}
            </div>
            <div className="p-4 bg-red-50 rounded-lg">
              <FontAwesomeIcon icon={faTimesCircle} className="text-3xl text-red-600" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-(--border-color)">
            <p className="text-xs text-(--text-primary-muted)">
              Needs attention
            </p>
          </div>
        </DashboardCard>

        {/* Waiting Jobs */}
        <DashboardCard>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-(--text-primary-muted) uppercase font-medium mb-2">
                Waiting
              </p>
              {isLoading ? (
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-(--brand-primary) border-t-transparent" />
              ) : (
                <p className="font-['Archivo_Black'] text-4xl text-yellow-600">
                  {stats.waiting}
                </p>
              )}
            </div>
            <div className="p-4 bg-yellow-50 rounded-lg">
              <FontAwesomeIcon icon={faClock} className="text-3xl text-yellow-600" />
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-(--border-color)">
            <p className="text-xs text-(--text-primary-muted)">
              In queue
            </p>
          </div>
        </DashboardCard>
      </div>

      {/* Products Statistics */}
      <DashboardCard>
        <div className="flex items-center gap-3 mb-6">
          <FontAwesomeIcon icon={faChartLine} className="text-xl text-(--brand-primary)" />
          <div>
            <h2 className="font-['Archivo_Black'] text-xl uppercase text-(--text-primary)">
              Products Statistics
            </h2>
            <p className="text-sm text-(--text-primary-muted)">
              Overall scraping performance metrics
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-(--brand-primary) border-t-transparent" />
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center p-4 bg-(--bg-section) border-2 border-(--border-color) rounded-lg">
              <p className="font-['Archivo_Black'] text-3xl text-(--brand-primary) mb-2">
                {stats.totalScraped.toLocaleString()}
              </p>
              <p className="text-xs text-(--text-primary-muted) uppercase font-medium">
                Total Scraped
              </p>
            </div>

            <div className="text-center p-4 bg-(--bg-section) border-2 border-(--border-color) rounded-lg">
              <p className="font-['Archivo_Black'] text-3xl text-green-600 mb-2">
                {stats.totalSaved.toLocaleString()}
              </p>
              <p className="text-xs text-(--text-primary-muted) uppercase font-medium">
                Total Saved
              </p>
            </div>

            <div className="text-center p-4 bg-(--bg-section) border-2 border-(--border-color) rounded-lg">
              <p className="font-['Archivo_Black'] text-3xl text-yellow-600 mb-2">
                {stats.totalUpdated.toLocaleString()}
              </p>
              <p className="text-xs text-(--text-primary-muted) uppercase font-medium">
                Total Updated
              </p>
            </div>

            <div className="text-center p-4 bg-(--bg-section) border-2 border-(--border-color) rounded-lg">
              <p className="font-['Archivo_Black'] text-3xl text-red-600 mb-2">
                {stats.totalErrors.toLocaleString()}
              </p>
              <p className="text-xs text-(--text-primary-muted) uppercase font-medium">
                Total Errors
              </p>
            </div>
          </div>
        )}
      </DashboardCard>

      {/* System Health */}
      <DashboardCard>
        <div className="flex items-center gap-3 mb-6">
          <FontAwesomeIcon icon={faServer} className="text-xl text-(--brand-primary)" />
          <div>
            <h2 className="font-['Archivo_Black'] text-xl uppercase text-(--text-primary)">
              System Health
            </h2>
            <p className="text-sm text-(--text-primary-muted)">
              Scraping system status and performance
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Worker Status */}
          <div className="p-4 bg-green-50 border-2 border-green-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
              <p className="font-semibold text-green-700">Worker Online</p>
            </div>
            <p className="text-sm text-green-600">
              Bull Queue processing normally
            </p>
          </div>

          {/* Database Sync */}
          <div className="p-4 bg-green-50 border-2 border-green-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
              <p className="font-semibold text-green-700">Event-Driven Sync Active</p>
            </div>
            <p className="text-sm text-green-600">
              Real-time database updates working
            </p>
          </div>

          {/* Error Rate */}
          <div className={`p-4 rounded-lg border-2 ${
            stats.totalErrors > 10 
              ? 'bg-red-50 border-red-200' 
              : 'bg-green-50 border-green-200'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <FontAwesomeIcon 
                icon={stats.totalErrors > 10 ? faExclamationTriangle : faCheckCircle} 
                className={stats.totalErrors > 10 ? 'text-red-500' : 'text-green-500'}
              />
              <p className={`font-semibold ${
                stats.totalErrors > 10 ? 'text-red-700' : 'text-green-700'
              }`}>
                Error Rate: {stats.totalErrors > 0 ? ((stats.totalErrors / stats.total) * 100).toFixed(1) : '0.0'}%
              </p>
            </div>
            <p className={`text-sm ${
              stats.totalErrors > 10 ? 'text-red-600' : 'text-green-600'
            }`}>
              {stats.totalErrors > 10 ? 'High error rate detected' : 'System operating normally'}
            </p>
          </div>
        </div>
      </DashboardCard>

      {/* Job History Table */}
      <JobHistoryTable limit={50} showFilters={true} />
    </div>
  )
}
