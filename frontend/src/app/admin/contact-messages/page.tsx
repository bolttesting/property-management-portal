'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { contactAPI, authAPI } from '@/lib/api'
import toast from 'react-hot-toast'
import { 
  Home, Mail, Phone, MessageSquare, 
  Clock, CheckCircle, Archive, Trash2, Eye, X,
  LogOut, User as UserIcon, Filter
} from 'lucide-react'
import Link from 'next/link'

export default function ContactMessagesPage() {
  const router = useRouter()
  const { user, isAuthenticated, logout, hasHydrated } = useAuthStore()
  const [messages, setMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMessage, setSelectedMessage] = useState<any>(null)
  const [showMessageModal, setShowMessageModal] = useState(false)
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [loggingOut, setLoggingOut] = useState(false)

  useEffect(() => {
    if (!hasHydrated) return

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    const storedUser = typeof window !== 'undefined' ? localStorage.getItem('user') : null
    
    if (!token || !storedUser) {
      router.push('/auth/login')
      return
    }
    
    try {
      const parsedUser = JSON.parse(storedUser)
      if (parsedUser.userType !== 'admin') {
        router.push('/auth/login')
        return
      }
    } catch {
      router.push('/auth/login')
      return
    }
    
    if (isAuthenticated && user?.userType === 'admin') {
      loadMessages()
    }
  }, [hasHydrated, isAuthenticated, user, router, filterStatus])

  const loadMessages = async () => {
    try {
      setLoading(true)
      const params = filterStatus ? { status: filterStatus } : {}
      const response = await contactAPI.getAllMessages(params)
      setMessages(response.data.data.messages || [])
    } catch (error: any) {
      console.error('Failed to load contact messages:', error)
      toast.error('Failed to load contact messages')
    } finally {
      setLoading(false)
    }
  }

  const handleViewMessage = async (message: any) => {
    setSelectedMessage(message)
    setShowMessageModal(true)
    
    // Mark as read if unread
    if (message.status === 'new') {
      try {
        await contactAPI.markAsRead(message.id)
        // Update local state
        setMessages(messages.map(m => 
          m.id === message.id ? { ...m, status: 'read' } : m
        ))
      } catch (error) {
        console.error('Failed to mark message as read:', error)
      }
    }
  }

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      await contactAPI.updateStatus(id, status)
      toast.success('Message status updated')
      loadMessages()
      if (selectedMessage?.id === id) {
        setSelectedMessage({ ...selectedMessage, status })
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update status')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this message?')) {
      return
    }

    try {
      await contactAPI.delete(id)
      toast.success('Message deleted')
      loadMessages()
      if (selectedMessage?.id === id) {
        setShowMessageModal(false)
        setSelectedMessage(null)
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete message')
    }
  }

  const handleLogout = async () => {
    try {
      setLoggingOut(true)
      await authAPI.logout()
    } catch (error) {
      console.error('Logout API error:', error)
    } finally {
      logout()
      router.push('/auth/login')
      setLoggingOut(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new':
        return 'bg-blue-100 text-blue-800'
      case 'read':
        return 'bg-gray-100 text-gray-800'
      case 'replied':
        return 'bg-green-100 text-green-800'
      case 'archived':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'new':
        return <Clock className="h-4 w-4" />
      case 'read':
        return <Eye className="h-4 w-4" />
      case 'replied':
        return <CheckCircle className="h-4 w-4" />
      case 'archived':
        return <Archive className="h-4 w-4" />
      default:
        return <MessageSquare className="h-4 w-4" />
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/20">
      {/* Header */}
      <header className="glass sticky top-0 z-50 border-b border-white/20 backdrop-blur-xl bg-white/90 shadow-lg">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 md:h-20">
            <Link href="/admin/dashboard" className="flex items-center group/logo">
              <div className="relative">
                <Home className="h-8 w-8 text-primary group-hover/logo:scale-110 transition-transform duration-300" />
              </div>
              <span className="ml-3 text-xl md:text-2xl font-heading font-extrabold gradient-text">
                Admin Panel
              </span>
            </Link>

            <div className="flex items-center space-x-4">
              <Link href="/admin/dashboard" className="px-4 py-2 rounded-lg font-semibold text-gray-700 hover:text-primary hover:bg-primary/10 transition-all duration-300">
                Dashboard
              </Link>
              <div className="flex items-center gap-2 px-3 py-2 bg-primary/5 rounded-lg">
                <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <UserIcon className="h-4 w-4 text-primary" />
                </div>
                <span className="text-sm font-medium text-gray-700">{user?.email || 'Admin'}</span>
              </div>
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="px-4 py-2 rounded-lg font-semibold text-red-600 hover:bg-red-50 transition-all duration-300 flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="container-custom py-8 md:py-12">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-heading font-extrabold mb-3 gradient-text">
            Contact Messages
          </h1>
          <p className="text-lg text-gray-600">
            Manage and respond to contact form submissions
          </p>
        </div>

        {/* Filters */}
        <div className="mb-6 glass rounded-2xl shadow-xl p-4">
          <div className="flex items-center gap-4">
            <Filter className="h-5 w-5 text-gray-600" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="input-field max-w-xs"
            >
              <option value="">All Messages</option>
              <option value="new">New</option>
              <option value="read">Read</option>
              <option value="replied">Replied</option>
              <option value="archived">Archived</option>
            </select>
            <div className="ml-auto text-sm text-gray-600">
              Total: {messages.length} messages
            </div>
          </div>
        </div>

        {/* Messages List */}
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="glass rounded-2xl shadow-xl p-12 text-center">
              <MessageSquare className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 text-lg">No contact messages found</p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className="glass rounded-2xl shadow-xl p-6 hover:shadow-2xl transition-all duration-300 cursor-pointer"
                onClick={() => handleViewMessage(message)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-gray-900">{message.name}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${getStatusColor(message.status)}`}>
                        {getStatusIcon(message.status)}
                        {message.status.charAt(0).toUpperCase() + message.status.slice(1)}
                      </span>
                    </div>
                    <p className="text-gray-600 mb-2">{message.subject}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Mail className="h-4 w-4" />
                        {message.email}
                      </span>
                      {message.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-4 w-4" />
                          {message.phone}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {new Date(message.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleViewMessage(message)
                    }}
                    className="px-4 py-2 rounded-lg font-semibold text-primary hover:bg-primary/10 transition-all duration-300"
                  >
                    View
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Message Detail Modal */}
      {showMessageModal && selectedMessage && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass rounded-2xl shadow-2xl max-w-2xl w-full p-8 border border-white/20 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-2xl md:text-3xl font-heading font-bold gradient-text">
                Message Details
              </h2>
              <button
                onClick={() => {
                  setShowMessageModal(false)
                  setSelectedMessage(null)
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-full"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-gray-600">From</label>
                <p className="text-lg font-bold text-gray-900">{selectedMessage.name}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-gray-600">Email</label>
                  <p className="text-gray-900 flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    {selectedMessage.email}
                  </p>
                </div>
                {selectedMessage.phone && (
                  <div>
                    <label className="text-sm font-semibold text-gray-600">Phone</label>
                    <p className="text-gray-900 flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      {selectedMessage.phone}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-600">Subject</label>
                <p className="text-gray-900">{selectedMessage.subject}</p>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-600">Message</label>
                <div className="mt-2 p-4 bg-gray-50 rounded-lg">
                  <p className="text-gray-900 whitespace-pre-wrap">{selectedMessage.message}</p>
                </div>
              </div>

              <div className="text-sm text-gray-500">
                Received: {new Date(selectedMessage.created_at).toLocaleString()}
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 pt-6 border-t border-gray-200 flex flex-wrap gap-3">
              <a
                href={`mailto:${selectedMessage.email}?subject=Re: ${selectedMessage.subject}`}
                className="btn-primary flex items-center gap-2"
              >
                <Mail className="h-5 w-5" />
                Reply
              </a>
              {selectedMessage.status !== 'replied' && (
                <button
                  onClick={() => handleUpdateStatus(selectedMessage.id, 'replied')}
                  className="btn-secondary flex items-center gap-2"
                >
                  <CheckCircle className="h-5 w-5" />
                  Mark as Replied
                </button>
              )}
              {selectedMessage.status !== 'archived' && (
                <button
                  onClick={() => handleUpdateStatus(selectedMessage.id, 'archived')}
                  className="btn-secondary flex items-center gap-2"
                >
                  <Archive className="h-5 w-5" />
                  Archive
                </button>
              )}
              <button
                onClick={() => handleDelete(selectedMessage.id)}
                className="px-4 py-2 rounded-lg font-semibold text-red-600 hover:bg-red-50 transition-all duration-300 flex items-center gap-2"
              >
                <Trash2 className="h-5 w-5" />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

