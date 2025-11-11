'use client'

import { useState } from 'react'
import Link from 'next/link'
import Navigation from '@/components/Navigation'
import { authAPI } from '@/lib/api'
import toast from 'react-hot-toast'
import { Mail, Send, ArrowLeft } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!email) {
      toast.error('Please enter your email address')
      return
    }

    setSubmitting(true)
    try {
      await authAPI.forgotPassword(email)
      setSent(true)
      toast.success('If an account exists for this email, a reset link has been sent.')
    } catch (error: any) {
      console.error('Failed to request password reset:', error)
      const message =
        error.response?.data?.error?.message ||
        error.response?.data?.message ||
        'Unable to send password reset email'
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
              Forgot password
            </h1>
            <p className="mt-2 text-sm text-text-secondary">
              Enter your email address and we&apos;ll send you a link to reset your password.
            </p>
          </div>

          <div className="card">
            {sent ? (
              <div className="space-y-6 text-center">
                <div className="p-4 bg-primary/10 rounded-lg">
                  <Send className="h-10 w-10 text-primary mx-auto mb-2" />
                  <p className="text-text-secondary">
                    If an account exists for <span className="font-medium">{email}</span>, you&apos;ll receive an email shortly with reset instructions.
                  </p>
                </div>
                <p className="text-sm text-text-secondary">
                  Didn&apos;t get the email? Check your spam folder or{' '}
                  <button
                    type="button"
                    className="text-primary hover:underline font-medium"
                    onClick={() => setSent(false)}
                  >
                    try again with a different address
                  </button>
                  .
                </p>
                <Link href="/auth/login" className="btn-secondary inline-flex items-center gap-2 justify-center">
                  <ArrowLeft className="h-4 w-4" />
                  Back to login
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-text-primary mb-2">
                    Email address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-text-tertiary" />
                    <input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="input-field pl-10"
                      placeholder="your.email@example.com"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  <Send className="h-5 w-5" />
                  {submitting ? 'Sending reset link...' : 'Send reset link'}
                </button>
                <div className="text-center">
                  <Link href="/auth/login" className="text-sm text-primary hover:underline">
                    Remembered your password? Back to login
                  </Link>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}


