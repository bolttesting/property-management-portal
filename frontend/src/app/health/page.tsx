'use client'

import { useEffect, useState } from 'react'
import { Activity, Database, HardDrive, CheckCircle, XCircle, ExternalLink, RefreshCw } from 'lucide-react'

interface HealthStatus {
  status: string
  timestamp: string
  environment: string
  storage: {
    uploadDir: string
    imagesDir: string
    exists: boolean
    writable: boolean
    railwayVolume: string | null
    uploadDirEnv: string | null
    imageCount?: number
    links?: {
      uploads: string
      images: string
      documents: string
      api: string
      health: string
    }
  }
  database: string
  links?: {
    health: string
    api: string
    uploads: string
    images: string
    docs: string
  }
}

export default function HealthPage() {
  const [health, setHealth] = useState<HealthStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchHealth = async () => {
    try {
      setLoading(true)
      setError(null)
      const apiUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:5000'
      const response = await fetch(`${apiUrl}/health`)
      
      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`)
      }
      
      const data = await response.json()
      setHealth(data)
    } catch (err: any) {
      setError(err.message || 'Failed to fetch health status')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHealth()
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchHealth, 30000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/20">
        <div className="text-center">
          <RefreshCw className="h-12 w-12 text-primary animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading health status...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/20">
        <div className="text-center">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 text-lg font-semibold mb-2">Error</p>
          <p className="text-gray-600">{error}</p>
          <button
            onClick={fetchHealth}
            className="mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!health) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/20 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-4xl font-heading font-extrabold gradient-text flex items-center gap-3">
              <Activity className="h-10 w-10 text-primary" />
              System Health Status
            </h1>
            <button
              onClick={fetchHealth}
              className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
          <p className="text-gray-600">
            Last updated: {new Date(health.timestamp).toLocaleString()}
          </p>
        </div>

        {/* Status Card */}
        <div className="glass rounded-2xl shadow-xl p-6 mb-6 bg-white">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {health.status === 'ok' ? (
                <CheckCircle className="h-8 w-8 text-green-500" />
              ) : (
                <XCircle className="h-8 w-8 text-red-500" />
              )}
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Status: {health.status.toUpperCase()}</h2>
                <p className="text-sm text-gray-600">Environment: {health.environment}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Storage Status */}
        <div className="glass rounded-2xl shadow-xl p-6 mb-6 bg-white">
          <div className="flex items-center gap-3 mb-4">
            <HardDrive className="h-6 w-6 text-primary" />
            <h2 className="text-xl font-bold text-gray-900">Storage</h2>
          </div>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Upload Directory</p>
                <p className="font-mono text-sm bg-gray-100 p-2 rounded">{health.storage.uploadDir}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Images Directory</p>
                <p className="font-mono text-sm bg-gray-100 p-2 rounded">{health.storage.imagesDir}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                {health.storage.exists ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
                <span className="text-sm">Directory Exists</span>
              </div>
              <div className="flex items-center gap-2">
                {health.storage.writable ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
                <span className="text-sm">Writable</span>
              </div>
              {health.storage.imageCount !== undefined && (
                <div>
                  <span className="text-sm text-gray-600">Images: </span>
                  <span className="font-semibold">{health.storage.imageCount}</span>
                </div>
              )}
            </div>

            <div>
              <p className="text-sm text-gray-600 mb-2">Railway Volume</p>
              <p className="font-mono text-sm bg-gray-100 p-2 rounded">
                {health.storage.railwayVolume || 'Not configured (ephemeral storage)'}
              </p>
            </div>

            {health.storage.uploadDirEnv && (
              <div>
                <p className="text-sm text-gray-600 mb-2">Upload Directory (Env)</p>
                <p className="font-mono text-sm bg-gray-100 p-2 rounded">{health.storage.uploadDirEnv}</p>
              </div>
            )}

            {/* Storage Links */}
            {health.storage.links && (
              <div>
                <p className="text-sm text-gray-600 mb-2">Quick Links</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(health.storage.links).map(([key, url]) => (
                    <a
                      key={key}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors text-sm"
                    >
                      {key}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Database Status */}
        <div className="glass rounded-2xl shadow-xl p-6 mb-6 bg-white">
          <div className="flex items-center gap-3 mb-4">
            <Database className="h-6 w-6 text-primary" />
            <h2 className="text-xl font-bold text-gray-900">Database</h2>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <span className="text-sm">{health.database}</span>
          </div>
        </div>

        {/* System Links */}
        {health.links && (
          <div className="glass rounded-2xl shadow-xl p-6 bg-white">
            <h2 className="text-xl font-bold text-gray-900 mb-4">System Links</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(health.links).map(([key, url]) => (
                <a
                  key={key}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <span className="font-medium text-gray-700 capitalize">{key}</span>
                  <ExternalLink className="h-4 w-4 text-gray-400" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Warning if storage not configured */}
        {!health.storage.railwayVolume && (
          <div className="glass rounded-2xl shadow-xl p-6 bg-yellow-50 border-2 border-yellow-200 mt-6">
            <div className="flex items-start gap-3">
              <XCircle className="h-6 w-6 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-yellow-900 mb-2">Storage Not Configured</h3>
                <p className="text-sm text-yellow-800 mb-2">
                  Railway Volume is not configured. Images will be lost on deployment restart.
                </p>
                <p className="text-sm text-yellow-800">
                  Please set up a Railway Volume and configure <code className="bg-yellow-100 px-1 rounded">UPLOAD_DIR</code> environment variable.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

