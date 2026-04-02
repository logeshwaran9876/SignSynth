import { useState, useCallback } from 'react'

export function useWebSocket() {
  const [isConnected] = useState(true)
  const [connectionError] = useState<string | null>(null)

  const connect = useCallback(() => {
    console.log('[Mock WebSocket] Connected')
  }, [])

  const disconnect = useCallback(() => {
    console.log('[Mock WebSocket] Disconnected')
  }, [])

  const sendMessage = useCallback((message: any) => {
    console.log('[Mock WebSocket] Sending Message (Discarded):', message)
  }, [])

  return {
    isConnected,
    connectionError,
    connect,
    disconnect,
    sendMessage
  }
}
