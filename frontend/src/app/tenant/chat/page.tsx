"use client"

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { chatAPI } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import toast from 'react-hot-toast'
import { Loader2, MessageCircle, Send } from 'lucide-react'
import DashboardNavigation from '@/components/DashboardNavigation'

interface ChatRoom {
  id: string
  room_type: string
  participant1_id: string
  participant1_type: string
  participant2_id: string
  participant2_type: string
  last_message_preview?: string
  last_message_at?: string
  unread_count_participant1?: number
  unread_count_participant2?: number
  other_participant_email?: string
  other_participant_type?: string
}

interface ChatMessage {
  id: string
  message: string
  message_type: string
  sender_id: string
  sender_type: string
  sender_email?: string
  sender_name?: string
  created_at: string
}

function TenantChatPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isAuthenticated, user, hasHydrated } = useAuthStore()

  const [rooms, setRooms] = useState<ChatRoom[]>([])
  const [roomsLoading, setRoomsLoading] = useState(true)
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (!hasHydrated) return

    if (!isAuthenticated || user?.userType !== 'tenant') {
      router.replace('/auth/login')
      return
    }

    loadRooms()
  }, [hasHydrated, isAuthenticated, user, router])

  const loadRooms = async () => {
    try {
      setRoomsLoading(true)
      const response = await chatAPI.getRooms()
      setRooms(response.data?.data?.rooms || [])
    } catch (error: any) {
      console.error('Failed to load chat rooms:', error)
      toast.error(error.response?.data?.error?.message || 'Failed to load chat rooms')
    } finally {
      setRoomsLoading(false)
    }
  }

  const loadMessages = async (roomId: string) => {
    try {
      setMessagesLoading(true)
      const response = await chatAPI.getMessages(roomId)
      setMessages(response.data?.data?.messages || [])
      await chatAPI.markAsRead(roomId)
      await loadRooms()
    } catch (error: any) {
      console.error('Failed to load messages:', error)
      toast.error(error.response?.data?.error?.message || 'Failed to load messages')
    } finally {
      setMessagesLoading(false)
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedRoom || !newMessage.trim()) return

    try {
      setSending(true)
      await chatAPI.sendMessage({
        roomId: selectedRoom,
        message: newMessage.trim(),
      })
      setNewMessage('')
      await loadMessages(selectedRoom)
    } catch (error: any) {
      console.error('Failed to send message:', error)
      toast.error(error.response?.data?.error?.message || 'Failed to send message')
    } finally {
      setSending(false)
    }
  }

  useEffect(() => {
    const ownerId = searchParams.get('ownerId')
    const roomId = searchParams.get('roomId')

    const openRoom = async () => {
      if (ownerId) {
        try {
          const response = await chatAPI.getOrCreateRoom({
            recipientId: ownerId,
            recipientType: 'owner',
            roomType: 'owner_tenant',
          })
          const newRoomId = response.data?.data?.roomId
          if (newRoomId) {
            await loadRooms()
            setSelectedRoom(newRoomId)
            await loadMessages(newRoomId)
            router.replace(`/tenant/chat?roomId=${newRoomId}`)
          }
        } catch (error: any) {
          console.error('Failed to open chat room:', error)
          toast.error(error.response?.data?.error?.message || 'Unable to open chat room')
        }
      } else if (roomId) {
        setSelectedRoom(roomId)
        loadMessages(roomId)
      }
    }

    if ((ownerId || roomId) && isAuthenticated && user?.userType === 'tenant') {
      openRoom()
    }
  }, [searchParams, isAuthenticated, user, router])

  useEffect(() => {
    if (selectedRoom) {
      loadMessages(selectedRoom)
    } else {
      setMessages([])
    }
  }, [selectedRoom])

  const sortedRooms = useMemo(() => {
    return [...rooms].sort((a, b) => {
      const dateA = a.last_message_at ? new Date(a.last_message_at).getTime() : 0
      const dateB = b.last_message_at ? new Date(b.last_message_at).getTime() : 0
      return dateB - dateA
    })
  }, [rooms])

  const getUnreadCount = (room: ChatRoom) => {
    if (!user) return 0
    if (room.participant1_id === user.id) {
      return room.unread_count_participant1 || 0
    }
    return room.unread_count_participant2 || 0
  }

  const formatTimestamp = (value?: string) => {
    if (!value) return ''
    const date = new Date(value)
    if (isNaN(date.getTime())) return ''
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/20">
      <DashboardNavigation
        userType="tenant"
        navItems={[
          { href: '/tenant/dashboard', label: 'Dashboard' },
          { href: '/tenant/applications', label: 'Applications' },
          { href: '/tenant/favorites', label: 'Favorites' },
          { href: '/tenant/maintenance', label: 'Maintenance' },
          { href: '/tenant/move-permits', label: 'Move Permits' },
          { href: '/tenant/chat', label: 'Chat', icon: <MessageCircle className="h-4 w-4" /> },
        ]}
      />

      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl md:text-5xl font-heading font-extrabold mb-3 gradient-text">Messages</h1>
            <p className="text-lg text-gray-600">Chat with property owners and dealers</p>
          </div>
          <button
            onClick={loadRooms}
            className="btn-secondary flex items-center gap-2 self-start"
          >
            <Loader2 className={`h-4 w-4 ${roomsLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="glass rounded-2xl shadow-xl p-6 max-h-[75vh] overflow-y-auto bg-white">
            <h2 className="text-lg font-semibold mb-4 flex items-center">
              <MessageCircle className="h-5 w-5 mr-2 text-primary" />
              Conversations
            </h2>

            {roomsLoading ? (
              <div className="flex items-center justify-center py-10 text-gray-500">
                <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading chats...
              </div>
            ) : sortedRooms.length === 0 ? (
              <p className="text-gray-500 text-sm">No chats yet. Start a conversation from a property or application.</p>
            ) : (
              <div className="space-y-3">
                {sortedRooms.map((room) => {
                  const isActive = room.id === selectedRoom
                  const unread = getUnreadCount(room)
                  return (
                    <button
                      key={room.id}
                      onClick={() => setSelectedRoom(room.id)}
                      className={`w-full text-left p-4 rounded-xl transition-all border ${
                        isActive
                          ? 'border-primary bg-primary/10 shadow-md'
                          : 'border-transparent bg-gray-50 hover:bg-primary/5'
                      }`}
                    >
                      <p className="text-sm font-semibold text-gray-900">
                        {room.other_participant_email || 'Property Dealer'}
                      </p>
                      <p className="text-xs text-gray-500 uppercase tracking-wide mt-1">
                        {room.other_participant_type || 'owner'}
                      </p>
                      {room.last_message_preview && (
                        <p className="text-xs text-gray-500 mt-2 line-clamp-2">{room.last_message_preview}</p>
                      )}
                      <div className="flex justify-between items-center mt-3 text-[11px] text-gray-400">
                        <span>{formatTimestamp(room.last_message_at)}</span>
                        {unread > 0 && (
                          <span className="bg-primary text-white rounded-full px-2 py-[2px] text-[10px]">
                            {unread} unread
                          </span>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <div className="glass rounded-2xl shadow-xl p-6 lg:col-span-3 flex flex-col h-[75vh] bg-white">
            {selectedRoom ? (
              <>
                {(() => {
                  const currentRoom = rooms.find((room) => room.id === selectedRoom)
                  return (
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 border-b border-gray-100 pb-4 mb-4">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Chat with</p>
                        <p className="text-lg font-semibold text-gray-900 break-words">
                          {currentRoom?.other_participant_email || 'Property Dealer'}
                        </p>
                        {currentRoom?.other_participant_type && (
                          <p className="text-xs uppercase tracking-wide text-primary mt-1">
                            {currentRoom.other_participant_type}
                          </p>
                        )}
                      </div>
                      {currentRoom?.last_message_at && (
                        <span className="text-xs text-gray-400 whitespace-nowrap">
                          {formatTimestamp(currentRoom.last_message_at)}
                        </span>
                      )}
                    </div>
                  )
                })()}

                <div className="flex-1 overflow-y-auto border border-gray-100 rounded-xl p-4 bg-gray-50 space-y-3">
                  {messagesLoading ? (
                    <div className="flex items-center justify-center py-10 text-gray-500">
                      <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading messages...
                    </div>
                  ) : messages.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-10">No messages yet. Start the conversation below.</p>
                  ) : (
                    messages.map((message) => {
                      const isTenantMessage = message.sender_type === 'tenant'
                      return (
                        <div
                          key={message.id}
                          className={`max-w-xl rounded-2xl px-4 py-3 text-sm shadow-sm ${
                            isTenantMessage ? 'bg-primary text-white ml-auto' : 'bg-white text-gray-700'
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words leading-relaxed">{message.message}</p>
                          <span className={`block text-[10px] mt-1 ${isTenantMessage ? 'text-white/70' : 'text-gray-400'}`}>
                            {formatTimestamp(message.created_at)}
                          </span>
                        </div>
                      )
                    })
                  )}
                </div>

                <form onSubmit={handleSendMessage} className="mt-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-white border border-gray-200 rounded-2xl p-3 shadow-sm">
                    <textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type your message..."
                      className="flex-1 resize-none bg-transparent focus:outline-none text-sm text-gray-700"
                      rows={2}
                    />
                    <button
                      type="submit"
                      disabled={sending || !newMessage.trim()}
                      className="btn-primary self-end sm:self-auto flex items-center gap-2"
                    >
                      {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      <span>Send</span>
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
                Select a conversation to start chatting.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function TenantChatPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      }
    >
      <TenantChatPageContent />
    </Suspense>
  )
}
