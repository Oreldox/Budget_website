'use client'

import React from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center p-4">
          <Card className="w-full max-w-md bg-slate-900 border-slate-800">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 p-3 bg-red-500/10 rounded-full w-fit">
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
              <CardTitle className="text-xl text-slate-50">Une erreur est survenue</CardTitle>
              <CardDescription className="text-slate-400">
                {this.state.error?.message || 'Quelque chose s\'est mal passé'}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Button
                onClick={() => {
                  this.setState({ hasError: false, error: undefined })
                  window.location.reload()
                }}
                className="bg-cyan-600 hover:bg-cyan-700"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Rafraîchir la page
              </Button>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

// Hook for using error boundary programmatically
export function useErrorBoundary() {
  const [error, setError] = React.useState<Error | null>(null)

  const resetError = React.useCallback(() => {
    setError(null)
  }, [])

  const captureError = React.useCallback((err: Error) => {
    setError(err)
  }, [])

  React.useEffect(() => {
    if (error) {
      throw error
    }
  }, [error])

  return { captureError, resetError }
}

// Simple error display component
export function ErrorDisplay({
  error,
  onRetry
}: {
  error: string | Error
  onRetry?: () => void
}) {
  const message = typeof error === 'string' ? error : error.message

  return (
    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm text-red-400">{message}</p>
          {onRetry && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRetry}
              className="mt-2 text-red-400 hover:text-red-300"
            >
              <RefreshCw className="mr-2 h-3 w-3" />
              Réessayer
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

// Loading state with error handling
export function AsyncBoundary({
  children,
  loading,
  error,
  onRetry,
  loadingFallback,
}: {
  children: React.ReactNode
  loading?: boolean
  error?: string | Error | null
  onRetry?: () => void
  loadingFallback?: React.ReactNode
}) {
  if (loading) {
    return loadingFallback || (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500" />
      </div>
    )
  }

  if (error) {
    return <ErrorDisplay error={error} onRetry={onRetry} />
  }

  return <>{children}</>
}
