import Link from 'next/link'

export default function NotFound() {
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
      <h1 style={{ fontSize: '4rem', margin: '0' }}>404</h1>
      <p style={{ fontSize: '1.5rem', marginTop: '1rem', marginBottom: '2rem', color: '#94a3b8' }}>
        Page introuvable
      </p>
      <Link
        href="/"
        style={{
          padding: '0.75rem 1.5rem',
          backgroundColor: '#3b82f6',
          color: 'white',
          textDecoration: 'none',
          borderRadius: '0.5rem',
          fontSize: '1rem'
        }}
      >
        Retour à l'accueil
      </Link>
    </div>
  )
}
