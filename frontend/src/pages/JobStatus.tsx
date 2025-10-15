import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  XCircle, 
  Download,
  RotateCcw,
  ArrowLeft,
  LucideIcon, // Needed to type statusConfig icons
} from 'lucide-react'
import { 
  Clock, // Used inside statusConfig
  CheckCircle, // Used inside statusConfig
  Loader2, // Used inside statusConfig
  AlertCircle // Used inside statusConfig
} from 'lucide-react' 

import { formatDistanceToNow } from 'date-fns'
import SignPreview from '../components/SignPreview'
import { useJobs } from '../hooks/useJobs'
import { useWebSocket } from '../hooks/useWebSocket'
import toast from 'react-hot-toast'
// Removed Play and Pause imports (TS6133)

// --- FIX TS7053: Define types for job status and the status map ---
type JobStatusType = 'queued' | 'processing' | 'succeeded' | 'failed' | 'cancelled';

interface StatusConfigItem {
    icon: LucideIcon;
    color: string;
    bgColor: string;
    label: string;
}

// Map the specific string literals to the configuration object type
type StatusMapType = Record<JobStatusType, StatusConfigItem>;
// --- END FIX ---

export default function JobStatus() {
  const { jobId } = useParams<{ jobId: string }>()
  const navigate = useNavigate()
  const { getJob, retryJob, deleteJob } = useJobs()
  const { sendMessage } = useWebSocket()
  const [job, setJob] = useState<any>(null) // Consider defining a proper Job interface instead of 'any'
  const [isLoading, setIsLoading] = useState(true)
  const [isRetrying, setIsRetrying] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Define the status map with the new explicit type
  const statusConfig: StatusMapType = {
    queued: {
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
      label: 'Queued'
    },
    processing: {
      icon: Loader2,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      label: 'Processing'
    },
    succeeded: {
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      label: 'Completed'
    },
    failed: {
      icon: XCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      label: 'Failed'
    },
    cancelled: {
      icon: AlertCircle,
      color: 'text-gray-600',
      bgColor: 'bg-gray-100',
      label: 'Cancelled'
    }
  }

  useEffect(() => {
    if (!jobId) return

    const loadJob = async () => {
      try {
        const jobData = await getJob(jobId)
        setJob(jobData)
      } catch (error) {
        toast.error('Failed to load job details')
        navigate('/dashboard')
      } finally {
        setIsLoading(false)
      }
    }

    loadJob()
  }, [jobId, getJob, navigate])

  useEffect(() => {
    if (!jobId) return

    // Subscribe to job updates via WebSocket
    sendMessage({
      type: 'subscribe',
      job_id: jobId
    })

    return () => {
      sendMessage({
        type: 'unsubscribe',
        job_id: jobId
      })
    }
  }, [jobId, sendMessage])

  const handleRetry = async () => {
    if (!jobId) return
    
    setIsRetrying(true)
    try {
      await retryJob(jobId)
      toast.success('Job queued for retry')
    } catch (error) {
      toast.error('Failed to retry job')
    } finally {
      setIsRetrying(false)
    }
  }

  const handleDelete = async () => {
    if (!jobId) return
    
    // FIX: Replaced window.confirm() with a non-blocking UI alert/toast message
    // In a real app, this would be a custom modal, but using toast for quick non-blocking feedback.
    toast((t) => (
        <div className="flex flex-col space-y-2">
            <p className="font-semibold">Are you sure you want to delete this job?</p>
            <div className="flex space-x-2 justify-end">
                <button 
                    onClick={() => toast.dismiss(t.id)} 
                    className="btn btn-ghost text-sm"
                >
                    Cancel
                </button>
                <button 
                    onClick={() => {
                        toast.dismiss(t.id);
                        performDelete();
                    }} 
                    className="btn btn-primary text-sm bg-red-600 hover:bg-red-700"
                >
                    Delete
                </button>
            </div>
        </div>
    ), { duration: Infinity });

  }
  
  const performDelete = async () => {
    if (!jobId) return

    setIsDeleting(true)
    try {
      await deleteJob(jobId)
      toast.success('Job deleted')
      navigate('/dashboard')
    } catch (error) {
      toast.error('Failed to delete job')
    } finally {
      setIsDeleting(false)
    }
  }


  const handleDownload = () => {
    if (job?.video_url) {
      window.open(job.video_url, '_blank')
    }
  }

  // The original statusConfig object definition was moved above to allow for explicit typing

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading job details...</p>
        </div>
      </div>
    )
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">Job not found</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="btn btn-primary mt-4"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  // Cast job.status to the known type for type-safe indexing
  const statusKey = job.status as JobStatusType;
  // This line is now safe from TS7053 error:
  const config = statusConfig[statusKey]
  
  const StatusIcon = config.icon
  const isProcessing = job.status === 'processing' || job.status === 'queued'
  const isCompleted = job.status === 'succeeded'
  const isFailed = job.status === 'failed'

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown'
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`
  }

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'Unknown'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </button>
          
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Job Details
              </h1>
              <p className="text-gray-600">
                {job.text.length > 100 ? `${job.text.substring(0, 100)}...` : job.text}
              </p>
            </div>
            
            <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${config.bgColor} ${config.color}`}>
              <StatusIcon className={`w-4 h-4 ${isProcessing ? 'animate-spin' : ''}`} />
              <span>{config.label}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Video Preview */}
            <SignPreview
              poseData={job.metadata?.pose_data}
              videoUrl={job.video_url}
              thumbnailUrl={job.thumbnail_url}
              isLoading={isProcessing}
              error={job.error_message}
              onDownload={handleDownload}
            />

            {/* Progress */}
            {isProcessing && (
              <div className="card">
                <div className="card-content">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Processing Progress
                  </h3>
                  <div className="space-y-4">
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Progress</span>
                      <span>{job.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className="bg-primary-600 h-3 rounded-full transition-all duration-300"
                        style={{ width: `${job.progress}%` }}
                      />
                    </div>
                    <p className="text-sm text-gray-500">
                      {job.status === 'queued' 
                        ? 'Your job is in the queue and will start processing soon...'
                        : 'Generating your sign language video...'
                      }
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Error Details */}
            {isFailed && job.error_message && (
              <div className="card">
                <div className="card-content">
                  <h3 className="text-lg font-semibold text-red-900 mb-4 flex items-center">
                    <XCircle className="w-5 h-5 mr-2" />
                    Processing Failed
                  </h3>
                  <div className="bg-red-50 border border-red-200 rounded-md p-4">
                    <p className="text-red-700">{job.error_message}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Job Info */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Job Information</h3>
              </div>
              <div className="card-content space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Job ID</label>
                  <p className="text-sm text-gray-900 font-mono">{job.id}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-500">Created</label>
                  <p className="text-sm text-gray-900">
                    {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
                  </p>
                </div>
                
                {job.started_at && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Started</label>
                    <p className="text-sm text-gray-900">
                      {formatDistanceToNow(new Date(job.started_at), { addSuffix: true })}
                    </p>
                  </div>
                )}
                
                {job.completed_at && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Completed</label>
                    <p className="text-sm text-gray-900">
                      {formatDistanceToNow(new Date(job.completed_at), { addSuffix: true })}
                    </p>
                  </div>
                )}
                
                <div>
                  <label className="text-sm font-medium text-gray-500">Sign Language</label>
                  <p className="text-sm text-gray-900">{job.sign_language}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-500">Speed</label>
                  <p className="text-sm text-gray-900 capitalize">{job.speed}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-500">Quality</label>
                  <p className="text-sm text-gray-900 uppercase">{job.render_quality}</p>
                </div>
              </div>
            </div>

            {/* Video Details */}
            {isCompleted && (
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">Video Details</h3>
                </div>
                <div className="card-content space-y-4">
                  {job.duration && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Duration</label>
                      <p className="text-sm text-gray-900">{formatDuration(job.duration)}</p>
                    </div>
                  )}
                  
                  {job.file_size && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">File Size</label>
                      <p className="text-sm text-gray-900">{formatFileSize(job.file_size)}</p>
                    </div>
                  )}
                  
                  {job.processing_time && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Processing Time</label>
                      <p className="text-sm text-gray-900">{job.processing_time.toFixed(1)}s</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Actions</h3>
              </div>
              <div className="card-content space-y-3">
                {isCompleted && job.video_url && (
                  <button
                    onClick={handleDownload}
                    className="btn btn-primary w-full"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download Video
                  </button>
                )}
                
                {isFailed && (
                  <button
                    onClick={handleRetry}
                    disabled={isRetrying}
                    className="btn btn-outline w-full"
                  >
                    {isRetrying ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <RotateCcw className="w-4 h-4 mr-2" />
                    )}
                    Retry Job
                  </button>
                )}
                
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="btn btn-ghost w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  {isDeleting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <XCircle className="w-4 h-4 mr-2" />
                  )}
                  Delete Job
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
