import { useState, useEffect, useCallback, useRef } from 'react'

interface WebSocketMessage {
  type: string
  job_id?: string
  status?: string
  progress?: number
  data?: any
  error?: string
}

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttempts = useRef(0)
  const maxReconnectAttempts = 5

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return
    }

    try {
      const wsUrl = import.meta.env.VITE_WEBSOCKET_URL || 'ws://localhost:8000/ws'
      wsRef.current = new WebSocket(wsUrl)

      wsRef.current.onopen = () => {
        console.log('WebSocket connected')
        setIsConnected(true)
        setConnectionError(null)
        reconnectAttempts.current = 0
      }

      wsRef.current.onclose = (event) => {
        console.log('WebSocket disconnected', event.code, event.reason)
        setIsConnected(false)
        
        // Attempt to reconnect if not a clean close
        if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000)
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++
            connect()
          }, delay)
        }
      }

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error)
        setConnectionError('WebSocket connection failed')
      }

      wsRef.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data)
          handleMessage(message)
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error)
        }
      }
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error)
      setConnectionError('Failed to create WebSocket connection')
    }
  }, [])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'User disconnected')
      wsRef.current = null
    }
    
    setIsConnected(false)
  }, [])

  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message))
    } else {
      console.warn('WebSocket not connected, cannot send message:', message)
      // Try to reconnect if not connected
      if (reconnectAttempts.current < maxReconnectAttempts) {
        connect()
      }
    }
  }, [connect])

  const handleMessage = useCallback((message: WebSocketMessage) => {
    console.log('WebSocket message received:', message)
    
    // Handle different message types
    switch (message.type) {
      case 'job_update':
        // This would typically update job state in a global store
        // For now, we'll just log it
        console.log('Job update:', message)
        break
      case 'system_notification':
        console.log('System notification:', message)
        break
      case 'pong':
        console.log('Pong received')
        break
      default:
        console.log('Unknown message type:', message.type)
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [disconnect])

  // Auto-reconnect on focus
  useEffect(() => {
    const handleFocus = () => {
      if (!isConnected && reconnectAttempts.current < maxReconnectAttempts) {
        connect()
      }
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [isConnected, connect])

  return {
    isConnected,
    connectionError,
    connect,
    disconnect,
    sendMessage
  }
}

