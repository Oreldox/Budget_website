'use client'

import { useState, Suspense } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, AlertCircle, Eye, EyeOff, BarChart3 } from 'lucide-react'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/cockpit'

  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [invitationCode, setInvitationCode] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [invitationInfo, setInvitationInfo] = useState<{ organizationName: string; role: string } | null>(null)

  // Validate invitation code
  const validateCode = async (code: string) => {
    if (!code || code.length < 5) {
      setInvitationInfo(null)
      return
    }
    try {
      const res = await fetch('/api/invitations/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      if (res.ok) {
        const data = await res.json()
        setInvitationInfo({
          organizationName: data.organizationName,
          role: data.role,
        })
        setError('')
      } else {
        setInvitationInfo(null)
      }
    } catch {
      setInvitationInfo(null)
    }
  }

  // Handle registration
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setIsLoading(true)

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          password,
          invitationCode: invitationCode || undefined,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        setSuccess('Compte créé ! Vous pouvez maintenant vous connecter.')
        setMode('login')
        setName('')
        setInvitationCode('')
        setInvitationInfo(null)
      } else {
        setError(data.error || 'Erreur lors de la création du compte')
      }
    } catch {
      setError('Une erreur est survenue')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError('Email ou mot de passe incorrect')
      } else {
        router.push(callbackUrl)
        router.refresh()
      }
    } catch (err) {
      setError('Une erreur est survenue')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-slate-950">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 via-slate-900 to-cyan-900/20 p-12 flex-col justify-between relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 left-0 w-96 h-96 bg-cyan-500 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-500 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
        </div>

        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <BarChart3 className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">DSI Budget</h1>
              <p className="text-sm text-slate-400">Cockpit</p>
            </div>
          </div>
        </div>

        <div className="relative space-y-6">
          <h2 className="text-4xl font-bold text-white leading-tight">
            Pilotez votre budget<br />
            <span className="text-cyan-400">en toute simplicité</span>
          </h2>
          <p className="text-slate-400 text-lg max-w-md">
            Suivez vos engagements, gérez vos contrats et contrôlez vos factures depuis une interface unifiée.
          </p>
          <div className="flex gap-6 pt-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-white">100%</p>
              <p className="text-xs text-slate-500 uppercase tracking-wider">Sécurisé</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-white">24/7</p>
              <p className="text-xs text-slate-500 uppercase tracking-wider">Accessible</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-white">Multi</p>
              <p className="text-xs text-slate-500 uppercase tracking-wider">Tenant</p>
            </div>
          </div>
        </div>

        <div className="relative text-sm text-slate-500">
          © 2024 DSI Budget Cockpit. Tous droits réservés.
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile logo */}
          <div className="lg:hidden text-center">
            <div className="inline-flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold text-white">DSI Budget Cockpit</span>
            </div>
          </div>

          <div className="text-center lg:text-left">
            <h2 className="text-2xl font-bold text-white">
              {mode === 'login' ? 'Connexion' : 'Inscription'}
            </h2>
            <p className="mt-2 text-slate-400">
              {mode === 'login' ? 'Accédez à votre tableau de bord' : 'Créez votre compte'}
            </p>
          </div>

          <form onSubmit={mode === 'login' ? handleSubmit : handleRegister} className="space-y-5">
            {error && (
              <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm animate-in fade-in slide-in-from-top-2">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-sm animate-in fade-in slide-in-from-top-2">
                <span>{success}</span>
              </div>
            )}

            {mode === 'register' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="invitationCode" className="text-slate-300 text-sm">
                    Code d'invitation
                  </Label>
                  <Input
                    id="invitationCode"
                    type="text"
                    value={invitationCode}
                    onChange={(e) => {
                      setInvitationCode(e.target.value)
                      validateCode(e.target.value)
                    }}
                    placeholder="INV-XXXXXXXX"
                    disabled={isLoading}
                    className="h-11 bg-slate-800/50 border-slate-700 text-slate-50 placeholder-slate-500 focus:border-cyan-500/50 focus:ring-cyan-500/20 font-mono"
                  />
                  {invitationInfo && (
                    <p className="text-xs text-emerald-400">
                      ✓ Organisation: {invitationInfo.organizationName} • Rôle: {invitationInfo.role}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name" className="text-slate-300 text-sm">
                    Nom complet
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jean Dupont"
                    required
                    disabled={isLoading}
                    className="h-11 bg-slate-800/50 border-slate-700 text-slate-50 placeholder-slate-500 focus:border-cyan-500/50 focus:ring-cyan-500/20"
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-300 text-sm">
                Adresse email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@entreprise.fr"
                required
                disabled={isLoading}
                className="h-11 bg-slate-800/50 border-slate-700 text-slate-50 placeholder-slate-500 focus:border-cyan-500/50 focus:ring-cyan-500/20"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-300 text-sm">
                Mot de passe
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  disabled={isLoading}
                  className="h-11 pr-10 bg-slate-800/50 border-slate-700 text-slate-50 placeholder-slate-500 focus:border-cyan-500/50 focus:ring-cyan-500/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {mode === 'register' && (
                <p className="text-xs text-slate-500">Minimum 8 caractères</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-11 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-medium shadow-lg shadow-cyan-500/20 transition-all duration-200"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {mode === 'login' ? 'Connexion en cours...' : 'Création en cours...'}
                </>
              ) : (
                mode === 'login' ? 'Se connecter' : 'Créer mon compte'
              )}
            </Button>
          </form>

          <div className="text-center">
            {mode === 'login' ? (
              <p className="text-sm text-slate-500">
                Vous avez un code d'invitation ?{' '}
                <button
                  onClick={() => { setMode('register'); setError(''); setSuccess('') }}
                  className="text-cyan-400 hover:text-cyan-300"
                >
                  Créer un compte
                </button>
              </p>
            ) : (
              <p className="text-sm text-slate-500">
                Déjà un compte ?{' '}
                <button
                  onClick={() => { setMode('login'); setError(''); setSuccess('') }}
                  className="text-cyan-400 hover:text-cyan-300"
                >
                  Se connecter
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
          <p className="text-slate-400 text-sm">Chargement...</p>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
