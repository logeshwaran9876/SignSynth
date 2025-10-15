import { Routes, Route } from 'react-router-dom'
import { useEffect } from 'react'
import { useWebSocket } from './hooks/useWebSocket'
import { useJobs } from './hooks/useJobs'
import Layout from './components/Layout'
import Home from './pages/Home'
import Generate from './pages/Generate'
import JobStatus from './pages/JobStatus'
import Dashboard from './pages/Dashboard'
import { Toaster } from 'react-hot-toast'

function App() {
  const { connect, disconnect } = useWebSocket()
  const { refreshJobs } = useJobs()

  useEffect(() => {
    // Connect to WebSocket for real-time updates
    connect()

    // Refresh jobs on app load
    refreshJobs()

    return () => {
      disconnect()
    }
  }, [connect, disconnect, refreshJobs])

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50">
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/generate" element={<Generate />} />
          <Route path="/jobs/:jobId" element={<JobStatus />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </Layout>
      <Toaster />
    </div>
  )
}

export default App

