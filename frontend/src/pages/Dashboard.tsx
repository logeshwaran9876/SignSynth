import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Plus, 
  
  Search,
  BarChart3,

  XCircle,
  Loader2,
  RefreshCw
} from 'lucide-react'
import JobCard from '../components/JobCard'
import { useJobs } from '../hooks/useJobs'
import { useWebSocket } from '../hooks/useWebSocket'
import toast from 'react-hot-toast'

export default function Dashboard() {
  const navigate = useNavigate()
  const { 
    jobs, 
    loading, 
    error, 
    loadJobs, 
    refreshJobs, 
    deleteJob, 
    retryJob 
  } = useJobs()
  const { sendMessage } = useWebSocket()
  
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState('created_at')
  const [sortOrder, setSortOrder] = useState('desc')
  const [page, setPage] = useState(1)
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    loadJobs()
  }, [loadJobs])

  useEffect(() => {
    // Subscribe to job updates via WebSocket
    sendMessage({ type: 'subscribe_all' })

    return () => {
      sendMessage({ type: 'unsubscribe_all' })
    }
  }, [sendMessage])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await refreshJobs()
      toast.success('Jobs refreshed')
    } catch (error) {
      toast.error('Failed to refresh jobs')
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleJobRetry = async (jobId: string) => {
    try {
      await retryJob(jobId)
      toast.success('Job queued for retry')
    } catch (error) {
      toast.error('Failed to retry job')
    }
  }

  const handleJobDelete = async (jobId: string) => {
    try {
      await deleteJob(jobId)
      toast.success('Job deleted')
    } catch (error) {
      toast.error('Failed to delete job')
    }
  }

  // Filter and sort jobs
  const filteredJobs = jobs.filter(job => {
    const matchesSearch = job.text.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || job.status === statusFilter
    return matchesSearch && matchesStatus
  }).sort((a, b) => {
    const aValue = a[sortBy as keyof typeof a]
    const bValue = b[sortBy as keyof typeof b]
    
    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1
    } else {
      return aValue < bValue ? 1 : -1
    }
  })

  // Pagination
  const jobsPerPage = 12
  const totalPages = Math.ceil(filteredJobs.length / jobsPerPage)
  const paginatedJobs = filteredJobs.slice(
    (page - 1) * jobsPerPage,
    page * jobsPerPage
  )

  // Statistics
  const stats = {
    total: jobs.length,
    queued: jobs.filter(job => job.status === 'queued').length,
    processing: jobs.filter(job => job.status === 'processing').length,
    succeeded: jobs.filter(job => job.status === 'succeeded').length,
    failed: jobs.filter(job => job.status === 'failed').length,
    cancelled: jobs.filter(job => job.status === 'cancelled').length
  }

  const statusOptions = [
    { value: 'all', label: 'All Jobs' },
    { value: 'queued', label: 'Queued' },
    { value: 'processing', label: 'Processing' },
    { value: 'succeeded', label: 'Completed' },
    { value: 'failed', label: 'Failed' },
    { value: 'cancelled', label: 'Cancelled' }
  ]

  const sortOptions = [
    { value: 'created_at', label: 'Created Date' },
    { value: 'status', label: 'Status' },
    { value: 'text', label: 'Text' },
    { value: 'processing_time', label: 'Processing Time' }
  ]

  if (loading && jobs.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading jobs...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="w-8 h-8 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">Failed to load jobs</p>
          <button
            onClick={handleRefresh}
            className="btn btn-primary"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600">Manage your sign language video generation jobs</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="btn btn-outline"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                onClick={() => navigate('/generate')}
                className="btn btn-primary"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Job
              </button>
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 shadow-xl border border-gray-700 hover:-translate-y-1 transition-transform">
            <div className="text-center text-white">
              <div className="text-3xl font-black mb-1">{stats.total}</div>
              <div className="text-xs font-semibold uppercase tracking-widest text-gray-400">Total Jobs</div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-yellow-50 to-amber-100 rounded-2xl p-6 shadow-lg border border-yellow-200 hover:-translate-y-1 transition-transform">
            <div className="text-center">
              <div className="text-3xl font-black text-amber-700 mb-1 shadow-sm">{stats.queued}</div>
              <div className="text-xs font-bold uppercase tracking-widest text-amber-600/70">Queued</div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl p-6 shadow-lg border border-blue-200 hover:-translate-y-1 transition-transform">
            <div className="text-center">
              <div className="text-3xl font-black text-blue-700 mb-1 shadow-sm">{stats.processing}</div>
              <div className="text-xs font-bold uppercase tracking-widest text-blue-600/70">Processing</div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-emerald-50 to-teal-100 rounded-2xl p-6 shadow-lg border border-emerald-200 hover:-translate-y-1 transition-transform">
            <div className="text-center">
              <div className="text-3xl font-black text-emerald-700 mb-1 shadow-sm">{stats.succeeded}</div>
              <div className="text-xs font-bold uppercase tracking-widest text-emerald-600/70">Completed</div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-red-50 to-rose-100 rounded-2xl p-6 shadow-lg border border-red-200 hover:-translate-y-1 transition-transform">
            <div className="text-center">
              <div className="text-3xl font-black text-red-700 mb-1 shadow-sm">{stats.failed}</div>
              <div className="text-xs font-bold uppercase tracking-widest text-red-600/70">Failed</div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl p-6 shadow-lg border border-gray-300 hover:-translate-y-1 transition-transform">
            <div className="text-center">
              <div className="text-3xl font-black text-gray-600 mb-1 shadow-sm">{stats.cancelled}</div>
              <div className="text-xs font-bold uppercase tracking-widest text-gray-500/70">Cancelled</div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="card mb-8">
          <div className="card-content">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search jobs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input pl-10"
                />
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="input"
              >
                {statusOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              {/* Sort By */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="input"
              >
                {sortOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    Sort by {option.label}
                  </option>
                ))}
              </select>

              {/* Sort Order */}
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="input"
              >
                <option value="desc">Newest First</option>
                <option value="asc">Oldest First</option>
              </select>
            </div>
          </div>
        </div>

        {/* Jobs Grid */}
        {paginatedJobs.length === 0 ? (
          <div className="text-center py-12">
            <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No jobs found</h3>
            <p className="text-gray-500 mb-6">
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your filters or search terms'
                : 'Get started by creating your first video'
              }
            </p>
            <button
              onClick={() => navigate('/generate')}
              className="btn btn-primary"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create New Job
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {paginatedJobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  onRetry={handleJobRetry}
                  onDelete={handleJobDelete}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  Showing {((page - 1) * jobsPerPage) + 1} to {Math.min(page * jobsPerPage, filteredJobs.length)} of {filteredJobs.length} jobs
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                    className="btn btn-outline btn-sm"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-500">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={page === totalPages}
                    className="btn btn-outline btn-sm"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

