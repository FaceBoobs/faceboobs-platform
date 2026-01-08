import React, { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export default function SupabaseConnectionBanner() {
  const [connectionStatus, setConnectionStatus] = useState('checking') // 'checking', 'connected', 'error'
  const [errorDetails, setErrorDetails] = useState(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const checkConnection = async () => {
      try {
        const { error } = await supabase.from('users').select('count', { count: 'exact', head: true })

        if (error) {
          console.error('Supabase connection check failed:', error)
          setConnectionStatus('error')

          // Detect error type
          if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            setErrorDetails({
              type: 'network',
              message: 'Cannot connect to database. The Supabase project might be paused or unreachable.',
              action: 'Check your Supabase dashboard to ensure the project is active.'
            })
          } else if (error.message.includes('521') || error.code === 521) {
            setErrorDetails({
              type: '521',
              message: 'Database server is down (Error 521).',
              action: 'Your Supabase project appears to be paused. Please unpause it in your Supabase dashboard.'
            })
          } else if (error.message.includes('CORS')) {
            setErrorDetails({
              type: 'cors',
              message: 'CORS error detected.',
              action: 'Check your Supabase project CORS settings and ensure your app URL is whitelisted.'
            })
          } else {
            setErrorDetails({
              type: 'unknown',
              message: 'Database connection failed.',
              action: 'Please check your internet connection and try again.'
            })
          }
        } else {
          setConnectionStatus('connected')
        }
      } catch (err) {
        console.error('Connection test exception:', err)
        setConnectionStatus('error')
        setErrorDetails({
          type: 'exception',
          message: 'Failed to connect to database.',
          action: 'The Supabase project might be paused. Check https://app.supabase.com'
        })
      }
    }

    checkConnection()

    // Re-check every 30 seconds if there's an error
    const interval = setInterval(() => {
      if (connectionStatus === 'error') {
        checkConnection()
      }
    }, 30000)

    return () => clearInterval(interval)
  }, [connectionStatus])

  // Don't show banner if dismissed or connected or still checking
  if (dismissed || connectionStatus !== 'error') {
    return null
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-red-600 text-white px-4 py-3 shadow-lg">
      <div className="max-w-7xl mx-auto flex items-start justify-between">
        <div className="flex-1 pr-4">
          <div className="flex items-center mb-1">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span className="font-bold">Database Connection Error</span>
          </div>
          <p className="text-sm ml-7">{errorDetails?.message}</p>
          <p className="text-sm ml-7 mt-1 opacity-90">
            {errorDetails?.action}
          </p>
          <a
            href="https://app.supabase.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm ml-7 mt-2 inline-block underline hover:text-red-100"
          >
            Open Supabase Dashboard →
          </a>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="flex-shrink-0 text-white hover:text-red-100 transition-colors"
          aria-label="Dismiss"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  )
}
