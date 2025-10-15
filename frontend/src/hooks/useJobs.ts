import { useState, useEffect, useCallback } from 'react'
import { apiClient } from '../services/apiClient'


interface Job {
  id: string
  text: string
  status: 'queued' | 'processing' | 'succeeded' | 'failed' | 'cancelled'
  progress: number
  created_at: string
  started_at?: string
  completed_at?: string
  video_url?: string
  thumbnail_url?: string
  error_message?: string
  processing_time?: number
  file_size?: number
  duration?: number
  metadata?: any
  sign_language: string
  speed: string
  render_quality: string
}

interface JobCreateData {
  text: string
  language?: string
  sign_language?: 'ASL' | 'BSL' | 'ISL'
  speed?: 'slow' | 'normal' | 'fast'
  avatar_id?: string
  render_quality?: 'preview' | 'hd' | '4k'
  callback_url?: string
  metadata?: any
}

export function useJobs() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadJobs = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await apiClient.get('/jobs')
      setJobs(response.data.jobs || [])
    } catch (err: any) {
      setError(err.message || 'Failed to load jobs')
      console.error('Failed to load jobs:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const refreshJobs = useCallback(async () => {
    await loadJobs()
  }, [loadJobs])

  const getJob = useCallback(async (jobId: string): Promise<Job> => {
    try {
      const response = await apiClient.get(`/jobs/${jobId}`)
      return response.data
    } catch (err: any) {
      throw new Error(err.message || 'Failed to load job')
    }
  }, [])

  const createJob = useCallback(async (data: JobCreateData): Promise<Job> => {
    try {
      const response = await apiClient.post('/generate', data)
      const newJob = response.data
      
      // Add to local state
      setJobs(prev => [newJob, ...prev])
      
      return newJob
    } catch (err: any) {
      throw new Error(err.message || 'Failed to create job')
    }
  }, [])

  const updateJob = useCallback((jobId: string, updates: Partial<Job>) => {
    setJobs(prev => prev.map(job => 
      job.id === jobId ? { ...job, ...updates } : job
    ))
  }, [])

  const deleteJob = useCallback(async (jobId: string) => {
    try {
      await apiClient.delete(`/jobs/${jobId}`)
      setJobs(prev => prev.filter(job => job.id !== jobId))
    } catch (err: any) {
      throw new Error(err.message || 'Failed to delete job')
    }
  }, [])

  const retryJob = useCallback(async (jobId: string) => {
    try {
      await apiClient.post(`/jobs/${jobId}/retry`)
      // Update job status to queued
      updateJob(jobId, { status: 'queued', progress: 0, error_message: undefined })
    } catch (err: any) {
      throw new Error(err.message || 'Failed to retry job')
    }
  }, [updateJob])

  const cancelJob = useCallback(async (jobId: string) => {
    try {
      await apiClient.delete(`/jobs/${jobId}`)
      updateJob(jobId, { status: 'cancelled' })
    } catch (err: any) {
      throw new Error(err.message || 'Failed to cancel job')
    }
  }, [updateJob])

  // Load jobs on mount
  useEffect(() => {
    loadJobs()
  }, [loadJobs])

  return {
    jobs,
    loading,
    error,
    loadJobs,
    refreshJobs,
    getJob,
    createJob,
    updateJob,
    deleteJob,
    retryJob,
    cancelJob
  }
}

