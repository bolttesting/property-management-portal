'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/store/authStore'
import { authAPI } from '@/lib/api'
import toast from 'react-hot-toast'
import { Home, Mail, Lock, LogIn } from 'lucide-react'
import Navigation from '@/components/Navigation'

export default function LoginPage() {
  const router = useRouter()
  const setAuth = useAuthStore((state) => state.setAuth)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email || !password) {
      toast.error('Please enter both email and password')
      return
    }
    
    setLoading(true)

    try {
      const response = await authAPI.login(email, password)
      
      // Check if response has the expected structure
      if (!response.data || !response.data.data) {
        throw new Error('Invalid response from server')
      }
      
      const { token, user } = response.data.data

      if (!token || !user) {
        throw new Error('Missing token or user data')
      }

      setAuth(user, token)
      toast.success('Login successful!')

      // Wait a bit for the store to update, then redirect
      setTimeout(() => {
        if (user.userType === 'admin') {
          router.push('/admin/dashboard')
        } else if (user.userType === 'owner') {
          router.push('/owner/dashboard')
        } else {
          router.push('/tenant/dashboard')
        }
      }, 100)
    } catch (error: any) {
      console.error('Login error:', error)
      
      // Handle different error formats
      let errorMessage = 'Login failed'
      
      if (error.response) {
        // Server responded with error
        errorMessage = error.response.data?.error?.message || 
                      error.response.data?.message || 
                      `Server error: ${error.response.status}`
      } else if (error.request) {
        // Request was made but no response received
        errorMessage = 'Unable to connect to server. Please check if the backend is running.'
      } else {
        // Something else happened
        errorMessage = error.message || 'An unexpected error occurred'
      }
      
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background-light">
      <Navigation />
      <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          {/* Logo */}
          <div className="text-center mb-8">
            <h2 className="text-3xl font-heading font-bold text-text-primary">
              Sign in to your account
            </h2>
            <p className="mt-2 text-sm text-text-secondary">
              Or{' '}
              <Link href="/auth/register" className="text-primary font-medium hover:underline">
                create a new account
              </Link>
            </p>
          </div>

          {/* Login Form */}
          <div className="card">
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

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-text-primary mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-text-tertiary" />
                  <input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-field pl-10"
                    placeholder="Enter your password"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    type="checkbox"
                    className="h-4 w-4 text-primary focus:ring-primary border-border rounded"
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-sm text-text-secondary">
                    Remember me
                  </label>
                </div>

                <Link href="/auth/forgot-password" className="text-sm text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full flex items-center justify-center"
              >
                {loading ? (
                  <span>Signing in...</span>
                ) : (
                  <>
                    <LogIn className="mr-2 h-5 w-5" />
                    <span>Sign in</span>
                  </>
                )}
              </button>
            </form>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-text-secondary">Or continue with</span>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <button className="btn-secondary w-full">
                  Mobile OTP
                </button>
                <button className="btn-secondary w-full">
                  Facebook
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
