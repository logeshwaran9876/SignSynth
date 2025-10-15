import { useState } from 'react'
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  Download,
  Eye,
  Trash2,
  RotateCcw,
  AlertCircle
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useJobs } from '../hooks/useJobs'
import { useNavigate } from 'react-router-dom'

interface JobCardProps {
  job: {
    id: string
    text: string
    status: 'queued' | 'processing' | 'succeeded' | 'failed' | 'cancelled'
    progress: number
    created_at: string
    completed_at?: string
    video_url?: string
    thumbnail_url?: string
    error_message?: string
    processing_time?: number
    file_size?: number
    duration?: number
  }
  onRetry?: (jobId: string) => void
  onDelete?: (jobId: string) => void
  showActions?: boolean
}

const statusConfig = {
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

export default function JobCard({ 
  job, 
  onRetry, 
  onDelete, 
  showActions = true 
}: JobCardProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const { deleteJob, retryJob } = useJobs()
  const navigate = useNavigate()
  
  const config = statusConfig[job.status]
  const StatusIcon = config.icon
  const isProcessing = job.status === 'processing' || job.status === 'queued'
  const isCompleted = job.status === 'succeeded'
  const isFailed = job.status === 'failed'

  const handleView = () => {
    navigate(`/jobs/${job.id}`)
  }

  const handleDownload = () => {
    if (job.video_url) {
      window.open(job.video_url, '_blank')
    }
  }

  const handleRetry = async () => {
    if (onRetry) {
      onRetry(job.id)
    } else {
      await retryJob(job.id)
    }
  }

  const handleDelete = async () => {
    if (isDeleting) return
    
    setIsDeleting(true)
    try {
      if (onDelete) {
        onDelete(job.id)
      } else {
        await deleteJob(job.id)
      }
    } finally {
      setIsDeleting(false)
    }
  }

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
    <div className="card hover:shadow-md transition-shadow">
      <div className="card-content">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 truncate">
              {job.text.length > 60 ? `${job.text.substring(0, 60)}...` : job.text}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Created {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
            </p>
          </div>
          
          {/* Status badge */}
          <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${config.bgColor} ${config.color}`}>
            <StatusIcon className={`w-3 h-3 ${isProcessing ? 'animate-spin' : ''}`} />
            <span>{config.label}</span>
          </div>
        </div>

        {/* Progress bar */}
        {isProcessing && (
          <div className="mb-4">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Progress</span>
              <span>{job.progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${job.progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Error message */}
        {isFailed && job.error_message && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-700">{job.error_message}</p>
            </div>
          </div>
        )}

        {/* Job details */}
        {isCompleted && (
          <div className="mb-4 grid grid-cols-2 gap-4 text-sm text-gray-600">
            <div>
              <span className="font-medium">Duration:</span> {formatDuration(job.duration)}
            </div>
            <div>
              <span className="font-medium">File Size:</span> {formatFileSize(job.file_size)}
            </div>
            {job.processing_time && (
              <div>
                <span className="font-medium">Processing Time:</span> {job.processing_time.toFixed(1)}s
              </div>
            )}
            {job.completed_at && (
              <div>
                <span className="font-medium">Completed:</span> {formatDistanceToNow(new Date(job.completed_at), { addSuffix: true })}
              </div>
            )}
          </div>
        )}

        {/* Thumbnail */}
        {job.thumbnail_url && (
          <div className="mb-4">
            <img 
              src={job.thumbnail_url} 
              alt="Video thumbnail"
              className="w-full h-32 object-cover rounded-md"
            />
          </div>
        )}

        {/* Actions */}
        {showActions && (
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <div className="flex items-center space-x-2">
              <button
                onClick={handleView}
                className="btn btn-outline btn-sm"
              >
                <Eye className="w-4 h-4" />
                <span className="ml-1">View</span>
              </button>
              
              {isCompleted && job.video_url && (
                <button
                  onClick={handleDownload}
                  className="btn btn-primary btn-sm"
                >
                  <Download className="w-4 h-4" />
                  <span className="ml-1">Download</span>
                </button>
              )}
              
              {isFailed && (
                <button
                  onClick={handleRetry}
                  className="btn btn-outline btn-sm"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span className="ml-1">Retry</span>
                </button>
              )}
            </div>
            
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="btn btn-ghost btn-sm text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              {isDeleting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

