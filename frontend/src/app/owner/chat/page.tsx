"use client"

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { chatAPI } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import toast from 'react-hot-toast'
import { Loader2, MessageCircle, Send, ArrowLeft, Home } from 'lucide-react'
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
  other_participant_name?: string
  other_participant_mobile?: string
  connected_property?: string
  connected_property_address?: any
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

function OwnerChatPageContent() {
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

  // Ensure user is authenticated owner
  useEffect(() => {
    if (!hasHydrated) return

    if (!isAuthenticated || user?.userType !== 'owner') {
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

  // Handle query params to open or create chat room
  useEffect(() => {
    const tenantId = searchParams.get('tenantId')
    const roomId = searchParams.get('roomId')

    const openRoom = async () => {
      if (tenantId) {
        try {
          const response = await chatAPI.getOrCreateRoom({
            recipientId: tenantId,
            recipientType: 'tenant',
            roomType: 'owner_tenant',
          })
          const newRoomId = response.data?.data?.roomId
          if (newRoomId) {
            await loadRooms()
            setSelectedRoom(newRoomId)
            await loadMessages(newRoomId)
            router.replace(`/owner/chat?roomId=${newRoomId}`)
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

    if ((tenantId || roomId) && isAuthenticated && user?.userType === 'owner') {
      openRoom()
    }
  }, [searchParams, isAuthenticated, user, router])

  // Load messages when a different room is selected
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

  const ownerNavItems = [
    { href: '/owner/dashboard', label: 'Dashboard' },
    { href: '/owner/tenants', label: 'Tenants' },
    { href: '/owner/properties', label: 'Properties' },
    { href: '/owner/applications', label: 'Applications' },
    { href: '/owner/maintenance', label: 'Maintenance' },
    { href: '/owner/move-permits', label: 'Move Permits' },
    { href: '/owner/chat', label: 'Chat', icon: <MessageCircle className="h-4 w-4" /> },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/20">
      <DashboardNavigation userType="owner" navItems={ownerNavItems} />
      
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl md:text-5xl font-heading font-extrabold mb-3 gradient-text">
              Messages
            </h1>
            <p className="text-lg text-gray-600">
              Chat with your tenants
            </p>
          </div>
          <button
            onClick={loadRooms}
            className="btn-secondary flex items-center gap-2"
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
              <div className="flex items-center justify-center py-10 text-text-secondary">
                <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading chats...
              </div>
            ) : sortedRooms.length === 0 ? (
              <p className="text-text-secondary text-sm">No chats yet. Start a conversation from an application card.</p>
            ) : (
              <div className="space-y-3">
                {sortedRooms.map((room) => {
                  const isActive = room.id === selectedRoom
                  const unread = getUnreadCount(room)
                  return (
                    <button
                      key={room.id}
                      onClick={() => setSelectedRoom(room.id)}
                      className={`w-full text-left p-3 rounded-lg border transition-all ${
                        isActive ? 'border-primary bg-primary-light/20' : 'border-border hover:border-primary'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-text-primary truncate">
                            {room.other_participant_name || room.other_participant_email || 'Tenant'}
                          </p>
                          {room.other_participant_mobile && (
                            <p className="text-xs text-text-secondary mt-0.5">
                              {room.other_participant_mobile}
                            </p>
                          )}
                          {room.connected_property && (
                            <div className="mt-1 flex items-center gap-1 text-xs text-primary">
                              <Home className="h-3 w-3" />
                              <span className="truncate">{room.connected_property}</span>
                            </div>
                          )}
                        </div>
                        {unread > 0 && (
                          <span className="bg-primary text-white rounded-full px-2 py-[1px] text-[10px] flex-shrink-0">
                            {unread}
                          </span>
                        )}
                      </div>
                      {room.last_message_preview && (
                        <p className="text-xs text-text-tertiary mt-2 line-clamp-2">{room.last_message_preview}</p>
                      )}
                      <div className="flex justify-between items-center mt-2 text-[11px] text-text-tertiary">
                        <span>{formatTimestamp(room.last_message_at)}</span>
                        <span className="text-[10px] uppercase">
                          {room.other_participant_type || ''}
                        </span>
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
                  const currentRoom = rooms.find((room) => room.id === selectedRoom);
                  return (
                    <div className="flex items-start justify-between border-b border-border pb-3 mb-4 gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-text-secondary mb-1">Chat with</p>
                        <p className="text-lg md:text-xl font-bold text-text-primary break-words">
                          {currentRoom?.other_participant_name || currentRoom?.other_participant_email || 'Unknown Tenant'}
                        </p>
                        {currentRoom?.other_participant_email && currentRoom?.other_participant_name && (
                          <p className="text-sm text-text-secondary mt-0.5 break-all">
                            {currentRoom.other_participant_email}
                          </p>
                        )}
                        {currentRoom?.other_participant_mobile && (
                          <p className="text-sm text-text-secondary mt-1 flex items-center gap-1">
                            <span>📱</span>
                            <span>{currentRoom.other_participant_mobile}</span>
                          </p>
                        )}
                        {currentRoom?.connected_property && (
                          <div className="mt-2 p-2 bg-primary/5 rounded-lg border border-primary/10">
                            <div className="flex items-center gap-1 text-sm font-semibold text-primary mb-1">
                              <Home className="h-4 w-4" />
                              <span>Connected Property:</span>
                            </div>
                            <p className="text-sm text-text-primary">{currentRoom.connected_property}</p>
                            {currentRoom.connected_property_address && (
                              <p className="text-xs text-text-secondary mt-1">
                                {typeof currentRoom.connected_property_address === 'object' 
                                  ? (currentRoom.connected_property_address.location || currentRoom.connected_property_address.area || '')
                                  : ''}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                      {currentRoom?.last_message_at && (
                        <span className="text-xs text-text-tertiary flex-shrink-0 whitespace-nowrap">
                          {formatTimestamp(currentRoom.last_message_at)}
                        </span>
                      )}
                    </div>
                  );
                })()}

                <div className="flex-1 overflow-y-auto border border-border rounded-lg p-4 bg-background-gray/40 space-y-3">
                  {messagesLoading ? (
                    <div className="flex items-center justify-center py-10 text-text-secondary">
                      <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading messages...
                    </div>
                  ) : messages.length === 0 ? (
                    <p className="text-sm text-text-secondary text-center py-10">No messages yet. Start the conversation below.</p>
                  ) : (
                    messages.map((message) => {
                      const isOwnerMessage = message.sender_type === 'owner'
                      return (
                        <div
                          key={message.id}
                          className={`max-w-xl rounded-lg px-3 py-2 text-sm ${
                            isOwnerMessage ? 'bg-primary text-white ml-auto' : 'bg-white border border-border'
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words">{message.message}</p>
                          <span className={`block text-[10px] mt-1 ${isOwnerMessage ? 'text-white/80' : 'text-text-tertiary'}`}>
                            {formatTimestamp(message.created_at)}
                          </span>
                        </div>
                      )
                    })
                  )}
                </div>

                <form onSubmit={handleSendMessage} className="mt-4 border border-border rounded-lg overflow-hidden">
                  <div className="flex">
                    <textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type your message..."
                      className="flex-1 resize-none p-3 text-sm focus:outline-none"
                      rows={3}
                    />
                    <button
                      type="submit"
                      disabled={sending || !newMessage.trim()}
                      className="bg-primary text-white px-4 flex items-center justify-center"
                    >
                      {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-text-secondary text-sm">
                Select a conversation to start chatting.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function OwnerChatPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      }
    >
      <OwnerChatPageContent />
    </Suspense>
  )
}
