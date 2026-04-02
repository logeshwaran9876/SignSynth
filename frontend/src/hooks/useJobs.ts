import { useEffect, useCallback } from 'react'
import { create } from 'zustand'
import { findBestMatch, videoList } from '../utils/matching'
import { checkRateLimit, logVideoGeneration } from '../utils/rateLimit'

export interface Job {
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

export interface JobCreateData {
  text: string
  language?: string
  sign_language?: 'ASL' | 'BSL' | 'ISL'
  speed?: 'slow' | 'normal' | 'fast'
  avatar_id?: string
  render_quality?: 'preview' | 'hd' | '4k'
  callback_url?: string
  metadata?: any
}

interface JobState {
  jobs: Job[]
  loading: boolean
  error: string | null
  addJob: (job: Job) => void
  updateJobData: (id: string, updates: Partial<Job>) => void
  removeJob: (id: string) => void
  setJobs: (jobs: Job[]) => void
}

// Generate some deterministic past dates
const now = Date.now();
const past1 = new Date(now - 86400000).toISOString(); // 1 day ago
const past2 = new Date(now - 172800000).toISOString(); // 2 days ago
const past3 = new Date(now - 259200000).toISOString(); // 3 days ago

// Global Store
const useJobStore = create<JobState>((set) => ({
  jobs: [
    {
      id: "mk-1a2b", text: "Hello, welcome to Indian Sign Language translation.", status: "succeeded", progress: 100, created_at: past3, started_at: past3, completed_at: new Date(new Date(past3).getTime() + 120000).toISOString(), video_url: "/Videos/Sign1.mp4", processing_time: 120, file_size: 4500000, duration: 4.5, sign_language: "ISL", speed: "normal", render_quality: "hd"
    },
    {
      id: "mk-2c3d", text: "How are you doing today?", status: "succeeded", progress: 100, created_at: past2, started_at: past2, completed_at: new Date(new Date(past2).getTime() + 95000).toISOString(), video_url: "/Videos/Sign2.mp4", processing_time: 95, file_size: 3200000, duration: 3.2, sign_language: "ISL", speed: "normal", render_quality: "hd"
    },
    {
      id: "mk-3e4f", text: "Wait, there is a complex agglutinative structure here.", status: "failed", progress: 45, created_at: past1, started_at: past1, error_message: "Transformer OOM error during NMM extraction phase.", sign_language: "ISL", speed: "normal", render_quality: "4k"
    },
    {
      id: "mk-4g5h", text: "I am going to the store to buy some fresh fruit.", status: "cancelled", progress: 12, created_at: new Date(now - 3600000).toISOString(), started_at: new Date(now - 3600000).toISOString(), sign_language: "ISL", speed: "normal", render_quality: "hd"
    },
    {
      id: "mk-5i6j", text: "This is a live processing example using the background simulation.", status: "processing", progress: 34, created_at: new Date(now - 60000).toISOString(), started_at: new Date(now - 60000).toISOString(), sign_language: "ISL", speed: "fast", render_quality: "hd"
    },
    {
      id: "mk-6k7l", text: "A queued task waiting for server resources.", status: "queued", progress: 0, created_at: new Date(now - 30000).toISOString(), sign_language: "ISL", speed: "normal", render_quality: "preview"
    }
  ],
  loading: false,
  error: null,
  addJob: (job) => set((state) => ({ jobs: [job, ...state.jobs] })),
  updateJobData: (id, updates) => set((state) => ({
    jobs: state.jobs.map((j) => (j.id === id ? { ...j, ...updates } : j))
  })),
  removeJob: (id) => set((state) => ({ jobs: state.jobs.filter((j) => j.id !== id) })),
  setJobs: (jobs) => set({ jobs }),
}))

// We use a global variable to ensure only one interval runs, 
// but we evaluate the env variable INSIDE the loop so changes apply instantly!
// @ts-ignore
if (window.__simulationInterval) {
  // @ts-ignore
  clearInterval(window.__simulationInterval);
}

function startGlobalSimulation() {
  const intervalMs = 1000; // run loop every 1s

  const intervalId = setInterval(() => {
    // Read ENV dynamically every tick so you can control speed mid-flight just by changing .env!
    const renderTimeMs = parseInt(import.meta.env.VITE_RENDER_TIME || "180000", 10);
    const progressPerStep = 100 / (renderTimeMs / intervalMs);

    const { jobs, updateJobData } = useJobStore.getState();
    const now = new Date().toISOString()

    jobs.forEach(job => {
      if (job.status === 'queued') {
        updateJobData(job.id, { 
          status: 'processing', 
          started_at: now, 
          progress: 1 
        });
      }

      if (job.status === 'processing') {
        const newProgress = Math.min(job.progress + progressPerStep, 100);
        
        if (newProgress >= 100) {
          // It's finished. Find the local video using matching algorithm.
          const match = findBestMatch(job.text, videoList);
          
          updateJobData(job.id, {
            status: 'succeeded',
            progress: 100,
            completed_at: now,
            video_url: `/Videos/${match.video}`,
            metadata: {
              confidence: match.confidence,
              matchedKeywords: match.matchedKeywords
            }
          });
          logVideoGeneration();
        } else {
          updateJobData(job.id, { progress: newProgress });
        }
      }
    });

  }, intervalMs);

  // @ts-ignore
  window.__simulationInterval = intervalId;
}
// Automatically start
startGlobalSimulation();

export function useJobs() {
  const jobs = useJobStore((state) => state.jobs)
  const loading = useJobStore((state) => state.loading)
  const error = useJobStore((state) => state.error)
  const { addJob, updateJobData, removeJob, setJobs } = useJobStore.getState()

  const loadJobs = useCallback(async () => {
    // We already keep state perfectly in memory, no need to touch network or localstorage for now.
    // In a full implementation, we could hydrate from localStorage here.
  }, [])

  const refreshJobs = useCallback(async () => {
    await loadJobs()
  }, [loadJobs])

  const getJob = useCallback(async (jobId: string): Promise<Job> => {
    return new Promise((resolve, reject) => {
      const job = useJobStore.getState().jobs.find(j => j.id === jobId);
      if (job) resolve(job);
      else reject(new Error('Job not found'));
    });
  }, [])

  const createJob = useCallback(async (data: JobCreateData): Promise<Job> => {
    // 1. Rate Limiting Emulation
    if (!checkRateLimit()) {
      throw new Error("You've reached the hourly limit of video generation requests. Please try again later.");
    }

    const newJob: Job = {
      id: Math.random().toString(36).substring(2, 11),
      text: data.text,
      status: 'queued',
      progress: 0,
      created_at: new Date().toISOString(),
      sign_language: data.sign_language || 'ASL',
      speed: data.speed || 'normal',
      render_quality: data.render_quality || 'hd'
    }
    
    addJob(newJob)
    return newJob
  }, [addJob])

  const updateJob = useCallback((jobId: string, updates: Partial<Job>) => {
    updateJobData(jobId, updates)
  }, [updateJobData])

  const deleteJob = useCallback(async (jobId: string) => {
    removeJob(jobId)
  }, [removeJob])

  const retryJob = useCallback(async (jobId: string) => {
    updateJobData(jobId, { status: 'queued', progress: 0, error_message: undefined, started_at: undefined, completed_at: undefined })
  }, [updateJobData])

  const cancelJob = useCallback(async (jobId: string) => {
    updateJobData(jobId, { status: 'cancelled' })
  }, [updateJobData])

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
