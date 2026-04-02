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

    // Instead of WebSockets, we poll our local simulation state every second
    const interval = setInterval(async () => {
      try {
        const jobData = await getJob(jobId)
        setJob(jobData)
      } catch (error) {
        // Ignore errors during polling
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [jobId, getJob])

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
        <div className="mb-12">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center text-gray-500 hover:text-primary-600 mb-6 transition-colors font-medium border border-gray-200 px-4 py-2 rounded-full shadow-sm hover:shadow-md bg-white w-max"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </button>
          
          <div className="flex flex-col md:flex-row items-start justify-between gap-4 bg-white p-8 rounded-3xl shadow-lg border border-gray-100">
            <div className="flex-1">
              <h1 className="text-3xl lg:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-600 mb-2 tracking-tight">
                Job Details Overview
              </h1>
              <p className="text-gray-600 text-lg font-medium leading-relaxed max-w-2xl">
                "{job.text.length > 100 ? `${job.text.substring(0, 100)}...` : job.text}"
              </p>
            </div>
            
            <div className={`flex items-center px-6 py-3 rounded-full text-sm font-bold shadow-md border border-white/50 backdrop-blur-sm ${config.bgColor} ${config.color} shrink-0`}>
              <StatusIcon className={`w-5 h-5 mr-2 ${isProcessing ? 'animate-spin' : ''}`} />
              <span className="uppercase tracking-widest">{config.label}</span>
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
              <div className="bg-white rounded-3xl p-8 shadow-xl shadow-gray-200/50 border border-gray-100 mb-8 overflow-hidden relative">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 via-primary-500 to-purple-500"></div>
                <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                  <div className="p-2 bg-primary-50 rounded-xl mr-3">
                    <Loader2 className="w-6 h-6 text-primary-600 animate-spin" />
                  </div>
                  Live Edge Processing Pipeline
                </h3>
                <div className="space-y-6">
                  <div className="flex justify-between items-end border-b border-gray-100 pb-2">
                    <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Synthesis Progress</span>
                    <span className="text-3xl font-black text-primary-600 shadow-sm leading-none">{Math.round(job.progress || 0)}%</span>
                  </div>
                  
                  <div className="w-full bg-gray-100 rounded-full h-6 overflow-hidden shadow-inner border border-gray-200">
                    <div 
                      className="bg-gradient-to-r from-blue-500 via-primary-500 to-purple-500 h-full rounded-full transition-all duration-700 ease-out relative"
                      style={{ width: `${job.progress}%` }}
                    >
                      <div className="absolute inset-0 bg-white/20 animate-pulse w-full"></div>
                    </div>
                  </div>
                  
                  <div className="space-y-4 mt-8 bg-gray-50 rounded-2xl p-6 border border-gray-200 shadow-sm relative">
                    <div className="absolute left-8 top-10 bottom-10 w-0.5 bg-gray-200 z-0"></div>
                    
                    {/* Stage 1 */}
                    <div className={`flex items-center space-x-4 text-sm transition-colors relative z-10 ${job.progress >= 0 ? 'text-gray-900' : 'text-gray-400'}`}>
                      <div className="bg-white rounded-full p-1 shadow-sm">
                        {job.progress >= 25 ? <CheckCircle className="w-6 h-6 text-emerald-500" /> : (job.progress >= 0 ? <Loader2 className="w-6 h-6 text-primary-500 animate-spin" /> : <div className="w-6 h-6 rounded-full border-2 border-gray-300" />)}
                      </div>
                      <span className={job.progress >= 25 ? 'font-bold text-emerald-700 text-base' : (job.progress >= 0 ? 'font-bold text-primary-700 text-base' : 'font-medium')}>Analyzing linguistic semantics</span>
                    </div>
                    
                    {/* Stage 2 */}
                    <div className={`flex items-center space-x-4 text-sm transition-colors relative z-10 ${job.progress >= 25 ? 'text-gray-900' : 'text-gray-400'}`}>
                      <div className="bg-white rounded-full p-1 shadow-sm">
                        {job.progress >= 50 ? <CheckCircle className="w-6 h-6 text-emerald-500" /> : (job.progress >= 25 ? <Loader2 className="w-6 h-6 text-primary-500 animate-spin" /> : <div className="w-6 h-6 rounded-full border-2 border-gray-300" />)}
                      </div>
                      <span className={job.progress >= 50 ? 'font-bold text-emerald-700 text-base' : (job.progress >= 25 ? 'font-bold text-primary-700 text-base' : 'font-medium')}>Mapping sequence to sign vocabulary</span>
                    </div>

                    {/* Stage 3 */}
                    <div className={`flex items-center space-x-4 text-sm transition-colors relative z-10 ${job.progress >= 50 ? 'text-gray-900' : 'text-gray-400'}`}>
                      <div className="bg-white rounded-full p-1 shadow-sm">
                        {job.progress >= 85 ? <CheckCircle className="w-6 h-6 text-emerald-500" /> : (job.progress >= 50 ? <Loader2 className="w-6 h-6 text-primary-500 animate-spin" /> : <div className="w-6 h-6 rounded-full border-2 border-gray-300" />)}
                      </div>
                      <span className={job.progress >= 85 ? 'font-bold text-emerald-700 text-base' : (job.progress >= 50 ? 'font-bold text-primary-700 text-base' : 'font-medium')}>Synthesizing 3D gestures and pacing</span>
                    </div>

                    {/* Stage 4 */}
                    <div className={`flex items-center space-x-4 text-sm transition-colors relative z-10 ${job.progress >= 85 ? 'text-gray-900' : 'text-gray-400'}`}>
                      <div className="bg-white rounded-full p-1 shadow-sm">
                        {job.progress >= 100 ? <CheckCircle className="w-6 h-6 text-emerald-500" /> : (job.progress >= 85 ? <Loader2 className="w-6 h-6 text-primary-500 animate-spin" /> : <div className="w-6 h-6 rounded-full border-2 border-gray-300" />)}
                      </div>
                      <span className={job.progress >= 100 ? 'font-bold text-emerald-700 text-base' : (job.progress >= 85 ? 'font-bold text-primary-700 text-base' : 'font-medium')}>Rendering and compiling high-fidelity video</span>
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* Error Details */}
            {isFailed && job.error_message && (
              <div className="bg-white rounded-3xl shadow-lg border border-red-100 overflow-hidden mb-8">
                <div className="bg-red-50 border-b border-red-100 px-8 py-5">
                  <h3 className="text-xl font-bold text-red-900 flex items-center tracking-wide">
                    <XCircle className="w-6 h-6 mr-3 text-red-500" />
                    Neural Synthesis Failed
                  </h3>
                </div>
                <div className="p-8">
                  <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
                    <label className="text-xs font-bold text-red-500 uppercase tracking-widest block mb-2">Error Log</label>
                    <p className="text-red-700 font-medium font-mono text-sm leading-relaxed">{job.error_message}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Job Info */}
            <div className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="bg-gray-50 border-b border-gray-100 px-6 py-4">
                <h3 className="font-bold text-gray-900 tracking-wide">Job Information</h3>
              </div>
              <div className="p-6 space-y-5">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-1">Job ID</label>
                  <p className="text-sm text-gray-900 font-mono bg-gray-100 px-2 py-1 rounded inline-block">{job.id}</p>
                </div>
                
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-1">Created</label>
                  <p className="text-sm text-gray-900 font-medium">
                    {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
                  </p>
                </div>
                
                {job.started_at && (
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-1">Started</label>
                    <p className="text-sm text-gray-900 font-medium">
                      {formatDistanceToNow(new Date(job.started_at), { addSuffix: true })}
                    </p>
                  </div>
                )}
                
                {job.completed_at && (
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-1">Completed</label>
                    <p className="text-sm text-green-600 font-bold">
                      {formatDistanceToNow(new Date(job.completed_at), { addSuffix: true })}
                    </p>
                  </div>
                )}
                
                <div className="flex gap-4 pt-4 border-t border-gray-100">
                  <div className="flex-1">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-1">Language</label>
                    <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-50 text-blue-700 font-bold text-sm">
                      {job.sign_language}
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-1">Quality</label>
                    <div className="inline-flex items-center px-3 py-1 rounded-full bg-purple-50 text-purple-700 font-bold text-sm">
                      {job.render_quality.toUpperCase()}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Video Details */}
            {isCompleted && (
              <div className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="bg-gray-50 border-b border-gray-100 px-6 py-4">
                  <h3 className="font-bold text-gray-900 tracking-wide">Video Details</h3>
                </div>
                <div className="p-6 space-y-4">
                  {job.duration && (
                    <div className="flex justify-between items-center bg-gray-50 p-3 rounded-xl border border-gray-100">
                      <label className="text-sm font-bold text-gray-600">Total Duration</label>
                      <p className="text-sm text-gray-900 font-black">{formatDuration(job.duration)}s</p>
                    </div>
                  )}
                  
                  {job.file_size && (
                    <div className="flex justify-between items-center bg-gray-50 p-3 rounded-xl border border-gray-100">
                      <label className="text-sm font-bold text-gray-600">Final File Size</label>
                      <p className="text-sm text-gray-900 font-black">{formatFileSize(job.file_size)}</p>
                    </div>
                  )}
                  
                  {job.processing_time && (
                    <div className="flex justify-between items-center bg-blue-50 p-3 rounded-xl border border-blue-100">
                      <label className="text-sm font-bold text-blue-800">Edge Processing Speed</label>
                      <p className="text-sm text-blue-900 font-black">{job.processing_time.toFixed(1)}s</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="bg-gray-50 border-b border-gray-100 px-6 py-4">
                <h3 className="font-bold text-gray-900 tracking-wide">Actions</h3>
              </div>
              <div className="p-6 space-y-3">
                {isCompleted && job.video_url && (
                  <button
                    onClick={handleDownload}
                    className="w-full flex items-center justify-center px-6 py-3 border border-transparent rounded-xl shadow-md text-white bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-500 hover:to-primary-600 font-bold transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    <Download className="w-5 h-5 mr-2" />
                    Download Video File
                  </button>
                )}
                
                {isFailed && (
                  <button
                    onClick={handleRetry}
                    disabled={isRetrying}
                    className="w-full flex items-center justify-center px-6 py-3 border-2 border-gray-200 rounded-xl shadow-sm text-gray-700 bg-white hover:bg-gray-50 font-bold transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-200"
                  >
                    {isRetrying ? (
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    ) : (
                      <RotateCcw className="w-5 h-5 mr-2" />
                    )}
                    Re-queue Job
                  </button>
                )}
                
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="w-full flex items-center justify-center px-6 py-3 border border-red-200 rounded-xl shadow-sm text-red-600 bg-red-50 hover:bg-red-100 hover:border-red-300 font-bold transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  {isDeleting ? (
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  ) : (
                    <XCircle className="w-5 h-5 mr-2" />
                  )}
                  Delete Completely
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
