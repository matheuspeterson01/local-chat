"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Send, Users, Wifi, Circle, LogOut, Settings, WifiOff } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useAuth } from "@/hooks/use-auth"
import { AuthForm } from "@/components/auth-form"
import { supabase } from "@/lib/supabase/client"
import type { Message, Profile } from "@/lib/supabase/types"
import { SetupGuide } from "@/components/setup-guide"
import { DatabaseSetup } from "@/components/database-setup"
import { ConnectionDebug } from "@/components/connection-debug"

export default function LocalChat() {
  const { user, profile, loading, signOut, updateStatus } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [users, setUsers] = useState<Profile[]>([])
  const [newMessage, setNewMessage] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [databaseReady, setDatabaseReady] = useState<boolean | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<string>("Conectando...")

  // Referências para conexões
  const usersChannelRef = useRef<any>(null)
  const socketRef = useRef<WebSocket | null>(null)

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Set user online when component mounts
  useEffect(() => {
    if (profile) {
      updateStatus("online")

      // Set offline when page unloads
      const handleBeforeUnload = () => {
        updateStatus("offline")
      }

      window.addEventListener("beforeunload", handleBeforeUnload)
      return () => window.removeEventListener("beforeunload", handleBeforeUnload)
    }
  }, [profile])

  // Check database on mount
  useEffect(() => {
    checkDatabase()
  }, [])

  // Fetch initial data and setup connections
  useEffect(() => {
    if (user && databaseReady) {
      fetchMessages()
      fetchUsers()
      setupRealtimeSubscriptions()
      setupWebSocket()
    }

    return () => {
      cleanupSubscriptions()
      cleanupWebSocket()
    }
  }, [user, databaseReady])

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase.from("profiles").select("*").order("username")

      if (error) {
        console.error("Error fetching users:", error)
        if (error.message.includes("does not exist")) {
          setDatabaseReady(false)
        }
      } else {
        setUsers(data || [])
        console.log(`Loaded ${data?.length || 0} users`)
      }
    } catch (error) {
      console.error("Error fetching users:", error)
      setDatabaseReady(false)
    }
  }

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from("messages")
        .select(`
        *,
        profiles (
          username,
          avatar_url
        )
      `)
        .order("created_at", { ascending: true })
        .limit(50)

      if (error) {
        console.error("Error fetching messages:", error)
        if (error.message.includes("does not exist")) {
          setDatabaseReady(false)
        }
      } else {
        setMessages(data || [])
        console.log(`Loaded ${data?.length || 0} messages`)
      }
    } catch (error) {
      console.error("Error fetching messages:", error)
      setDatabaseReady(false)
    }
  }

  const setupWebSocket = () => {
    const url = process.env.NEXT_PUBLIC_WEBSOCKET_URL || "ws://localhost:3001"
    console.log("🌐 Connecting to WebSocket:", url)
    const socket = new WebSocket(url)
    socketRef.current = socket

    socket.addEventListener("open", () => {
      console.log("🟢 WebSocket connected")
      setConnectionStatus("Conectado - WebSocket")
      setIsConnected(true)
    })

    socket.addEventListener("message", (event) => {
      try {
        const message: Message = JSON.parse(event.data)
        setMessages((prev) => {
          const exists = prev.some((m) => m.id === message.id)
          if (exists) return prev
          return [...prev, message]
        })
      } catch (err) {
        console.error("Error parsing websocket message", err)
      }
    })

    socket.addEventListener("close", () => {
      console.log("🔌 WebSocket disconnected")
      setIsConnected(false)
    })

    socket.addEventListener("error", (err) => {
      console.error("WebSocket error", err)
      setConnectionStatus("Erro WebSocket")
    })
  }

  const cleanupWebSocket = () => {
    if (socketRef.current) {
      console.log("Closing WebSocket connection")
      socketRef.current.close()
      socketRef.current = null
    }
  }

  const setupRealtimeSubscriptions = () => {
    console.log("🔄 Setting up realtime subscriptions...")

    // Cleanup existing subscriptions first
    cleanupSubscriptions()

    try {
      // Setup users subscription
      usersChannelRef.current = supabase
        .channel("public:profiles", {
          config: {
            broadcast: { self: true },
            presence: { key: user?.id },
          },
        })
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "profiles",
          },
          (payload) => {
            console.log("👤 Profile change received:", payload)
            // Refetch users when any profile changes
            fetchUsers()
          },
        )
        .on("error", (error) => {
          console.error("❌ Profiles subscription error:", error)
          setConnectionStatus("Erro na conexão")
          setIsConnected(false)
        })
        .subscribe((status) => {
          console.log("📡 Profiles subscription status:", status)
          if (status === "SUBSCRIBED") {
            setConnectionStatus("Conectado - Tempo Real")
            setIsConnected(true)
          }
        })

      console.log("✅ Realtime subscriptions setup complete")
    } catch (error) {
      console.error("❌ Error setting up subscriptions:", error)
      setConnectionStatus("Erro na configuração")
      setIsConnected(false)
    }
  }

  const cleanupSubscriptions = () => {
    console.log("🧹 Cleaning up subscriptions...")

    if (usersChannelRef.current) {
      supabase.removeChannel(usersChannelRef.current)
      usersChannelRef.current = null
      console.log("✅ Users channel removed")
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !user) return

    console.log("📤 Sending message:", newMessage.trim())

    try {
      const { data, error } = await supabase
        .from("messages")
        .insert({
          user_id: user.id,
          content: newMessage.trim(),
        })
        .select(
          `
          *,
          profiles (
            username,
            avatar_url
          )
        `
        )
        .single()

      if (error) {
        console.error("❌ Error sending message:", error)
        alert("Erro ao enviar mensagem. Tente novamente.")
      } else if (data) {
        console.log("✅ Message sent successfully:", data)
        socketRef.current?.send(JSON.stringify(data))
        setMessages((prev) => [...prev, data])
        setNewMessage("")
      }
    } catch (error) {
      console.error("❌ Unexpected error sending message:", error)
      alert("Erro inesperado. Tente novamente.")
    }
  }

  const handleSignOut = async () => {
    cleanupSubscriptions()
    await signOut()
  }

  const handleStatusChange = async (status: "online" | "away" | "offline") => {
    await updateStatus(status)
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const onlineUsers = users.filter((user) => user.status === "online")

  const checkDatabase = async () => {
    try {
      const { error } = await supabase.from("profiles").select("id").limit(1)
      setDatabaseReady(!error)
    } catch (error) {
      setDatabaseReady(false)
    }
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    return <SetupGuide />
  }

  if (databaseReady === false) {
    return <DatabaseSetup />
  }

  if (databaseReady === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Verificando banco de dados...</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!user || !profile) {
    return <AuthForm />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50">
      <div className="container mx-auto p-4 h-screen flex flex-col">
        {/* Header */}
        <Card className="mb-4 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg">
                  <Wifi className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                    Chat Local
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">Olá, {profile.username}!</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge
                  variant="secondary"
                  className={`${isConnected ? "bg-green-100 text-green-700 border-green-200" : "bg-red-100 text-red-700 border-red-200"}`}
                >
                  {isConnected ? <Wifi className="h-3 w-3 mr-1" /> : <WifiOff className="h-3 w-3 mr-1" />}
                  {connectionStatus}
                </Badge>
                <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-200">
                  <Circle className="h-2 w-2 fill-current mr-1" />
                  {onlineUsers.length} online
                </Badge>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleStatusChange("online")}>
                      <Circle className="h-2 w-2 fill-green-500 mr-2" />
                      Online
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleStatusChange("away")}>
                      <Circle className="h-2 w-2 fill-yellow-500 mr-2" />
                      Ausente
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleSignOut}>
                      <LogOut className="h-4 w-4 mr-2" />
                      Sair
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardHeader>
        </Card>

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-4 min-h-0">
          {/* Users Sidebar */}
          <Card className="lg:col-span-1 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5" />
                Usuários Online
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[400px] lg:h-[500px]">
                <div className="p-4 space-y-3">
                  {users.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="relative">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={user.avatar_url || "/placeholder.svg"} alt={user.username} />
                          <AvatarFallback className="bg-gradient-to-r from-purple-400 to-pink-400 text-white">
                            {user.username.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div
                          className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-white ${
                            user.status === "online"
                              ? "bg-green-500"
                              : user.status === "away"
                                ? "bg-yellow-500"
                                : "bg-gray-400"
                          }`}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{user.username}</p>
                        <p className="text-xs text-muted-foreground">
                          {user.status === "online"
                            ? "Online"
                            : user.status === "away"
                              ? "Ausente"
                              : `Visto ${formatTime(user.last_seen)}`}
                        </p>
                      </div>
                    </div>
                  ))}
                  {users.length === 0 && (
                    <div className="text-center text-muted-foreground text-sm py-4">Nenhum usuário encontrado</div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Chat Area */}
          <Card className="lg:col-span-3 bg-white/80 backdrop-blur-sm border-0 shadow-lg flex flex-col">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-lg">Conversa Geral</CardTitle>
            </CardHeader>

            {/* Messages */}
            <CardContent className="flex-1 p-0 flex flex-col min-h-0">
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex gap-3 ${message.user_id === user.id ? "flex-row-reverse" : ""}`}
                    >
                      <Avatar className="h-8 w-8 mt-1">
                        <AvatarImage
                          src={message.profiles?.avatar_url || "/placeholder.svg"}
                          alt={message.profiles?.username}
                        />
                        <AvatarFallback className="bg-gradient-to-r from-purple-400 to-pink-400 text-white text-xs">
                          {message.profiles?.username?.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className={`flex-1 max-w-[70%] ${message.user_id === user.id ? "text-right" : ""}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium">{message.profiles?.username}</span>
                          <span className="text-xs text-muted-foreground">{formatTime(message.created_at)}</span>
                        </div>
                        <div
                          className={`p-3 rounded-2xl ${
                            message.user_id === user.id
                              ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white ml-auto"
                              : "bg-muted"
                          }`}
                        >
                          <p className="text-sm">{message.content}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {messages.length === 0 && (
                    <div className="text-center text-muted-foreground py-8">
                      <p className="text-lg mb-2">👋 Seja bem-vindo ao chat!</p>
                      <p className="text-sm">Envie a primeira mensagem para começar a conversa</p>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Message Input */}
              <div className="p-4 border-t bg-muted/20">
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Digite sua mensagem..."
                    className="flex-1 bg-white border-0 shadow-sm"
                    disabled={!isConnected}
                  />
                  <Button
                    type="submit"
                    size="icon"
                    disabled={!isConnected || !newMessage.trim()}
                    className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 shadow-lg disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
                {!isConnected && (
                  <p className="text-xs text-red-600 mt-1">Reconectando... Aguarde para enviar mensagens.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
        <ConnectionDebug />
      </div>
    </div>
  )
}
