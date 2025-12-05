'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      fontFamily: 'system-ui, sans-serif',
      backgroundColor: '#0f172a',
      color: '#f1f5f9',
      padding: '20px'
    }}>
      <h1 style={{ fontSize: '3rem', margin: '0', color: '#ef4444' }}>Erreur</h1>
      <p style={{ fontSize: '1.25rem', marginTop: '1rem', marginBottom: '2rem', color: '#94a3b8', textAlign: 'center' }}>
        Une erreur s'est produite lors du chargement de cette page.
      </p>
      <button
        onClick={reset}
        style={{
          padding: '0.75rem 1.5rem',
          backgroundColor: '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: '0.5rem',
          fontSize: '1rem',
          cursor: 'pointer'
        }}
      >
        Réessayer
      </button>
    </div>
  )
}
