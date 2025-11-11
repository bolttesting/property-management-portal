'use client'

import { Suspense, useMemo, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Navigation from '@/components/Navigation'
import toast from 'react-hot-toast'
import { authAPI } from '@/lib/api'
import { Lock, Eye, EyeOff, ShieldCheck, ArrowLeft } from 'lucide-react'

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background-light flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  )
}

function ResetPasswordContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = useMemo(() => searchParams.get('token') ?? '', [searchParams])

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [completed, setCompleted] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!token) {
      toast.error('Reset token is missing or invalid.')
      return
    }

    if (!password || password.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    setSubmitting(true)
    try {
      await authAPI.resetPassword({ token, password, confirmPassword })
      setCompleted(true)
      toast.success('Password reset successfully! You can now sign in with your new password.')
    } catch (error: any) {
      console.error('Failed to reset password:', error)
      const message =
        error.response?.data?.error?.message ||
        error.response?.data?.message ||
        'Unable to reset password'
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background-light">
      <Navigation />
      <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-heading font-bold text-text-primary">
              Reset your password
            </h1>
            <p className="mt-2 text-sm text-text-secondary">
              Choose a new password to regain access to your account.
            </p>
          </div>

          <div className="card">
            {!token ? (
              <div className="space-y-6 text-center">
                <div className="p-4 bg-primary/10 rounded-lg">
                  <ShieldCheck className="h-10 w-10 text-primary mx-auto mb-2" />
                  <p className="text-text-secondary">
                    This password reset link is missing a token or has already been used. Please
                    request a new link.
                  </p>
                </div>
                <Link href="/auth/forgot-password" className="btn-primary inline-flex items-center gap-2 justify-center">
                  <ArrowLeft className="h-4 w-4" />
                  Request new reset link
                </Link>
              </div>
            ) : completed ? (
              <div className="space-y-6 text-center">
                <div className="p-4 bg-primary/10 rounded-lg">
                  <ShieldCheck className="h-10 w-10 text-primary mx-auto mb-2" />
                  <p className="text-text-secondary">
                    Your password has been reset. You can now sign in with your new credentials.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-primary inline-flex items-center gap-2 justify-center w-full"
                  onClick={() => router.push('/auth/login')}
                >
                  Go to login
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    New password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-text-tertiary" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="input-field pl-10 pr-10"
                      placeholder="Enter a new password"
                      required
                      minLength={8}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-secondary hover:text-text-primary"
                      aria-label="Toggle password visibility"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  <p className="text-xs text-text-secondary mt-1">
                    Password must be at least 8 characters long.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Confirm new password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-text-tertiary" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="input-field pl-10 pr-10"
                      placeholder="Re-enter your new password"
                      required
                      minLength={8}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-secondary hover:text-text-primary"
                      aria-label="Toggle confirm password visibility"
                    >
                      {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  <ShieldCheck className="h-5 w-5" />
                  {submitting ? 'Updating password...' : 'Update password'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}


