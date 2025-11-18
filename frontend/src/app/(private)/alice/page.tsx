"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Bot, Send, User, Loader2, MessageCircle, RefreshCw, Sparkles } from "lucide-react"
import { aliceAPI } from "@/lib/api/alice"

interface Message {
  id: string
  type: 'user' | 'assistant' | 'error'
  content: string
  timestamp: Date
  metadata?: {
    sql_query?: string
    execution_time_ms?: number
    result_count?: number
    error_details?: string
  }
}


export default function AlicePage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isPageLoading, setIsPageLoading] = useState(true)
  const [sessionId, setSessionId] = useState<string>("")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    // Adiciona mensagem inicial
    try {
      const welcomeMessage: Message = {
        id: "welcome",
        type: "assistant",
        content: "Olá! Eu sou a Alice, sua assistente virtual do Sistema Minerva. Posso ajudá-lo a consultar dados sobre contratos, orçamentos, funcionários e muito mais. Faça uma pergunta e eu transformarei ela em uma consulta SQL para buscar as informações que você precisa!",
        timestamp: new Date()
      }
      setMessages([welcomeMessage])
      setIsPageLoading(false)
    } catch (error) {
      console.error("Erro ao inicializar página Alice:", error)
      setIsPageLoading(false)
    }
  }, [])

  const sendMessage = async () => {
    if (!inputMessage.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: inputMessage.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputMessage("")
    setIsLoading(true)

    try {
      console.log("🚀 Enviando mensagem para Alice:", inputMessage.trim())
      const response = await aliceAPI.sendMessage({
        message: inputMessage.trim(),
        session_id: sessionId || undefined,
        create_new_session: !sessionId
      })
      console.log("✅ Resposta recebida:", response)

      if (response.success) {
        // Atualiza session_id se for uma nova sessão
        if (!sessionId && response.session_id) {
          setSessionId(response.session_id)
        }

        const assistantMessage: Message = {
          id: Date.now().toString() + "_assistant",
          type: "assistant",
          content: response.response,
          timestamp: new Date(),
          metadata: {
            sql_query: response.sql_query,
            execution_time_ms: response.execution_time_ms,
            result_count: response.result_count
          }
        }

        setMessages(prev => [...prev, assistantMessage])
      } else {
        const errorMessage: Message = {
          id: Date.now().toString() + "_error",
          type: "error",
          content: response.response || response.error || "Erro desconhecido",
          timestamp: new Date(),
          metadata: {
            error_details: response.error
          }
        }

        setMessages(prev => [...prev, errorMessage])
      }
    } catch (error) {
      console.error("Erro no chat:", error)
      
      const errorMessage: Message = {
        id: Date.now().toString() + "_error",
        type: "error",
        content: "Erro de conexão com o servidor. Tente novamente.",
        timestamp: new Date()
      }

      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const startNewSession = () => {
    setSessionId("")
    setMessages([{
      id: "welcome_new",
      type: "assistant",
      content: "Nova conversa iniciada! Como posso ajudá-lo?",
      timestamp: new Date()
    }])
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }


  // Loading state
  if (isPageLoading) {
    return (
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Sparkles className="h-8 w-8 text-purple-500" />
            Fale com Alice
          </h2>
        </div>
        <Card className="flex items-center justify-center h-96">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-purple-500" />
            <p className="text-muted-foreground">Carregando Alice...</p>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Sparkles className="h-8 w-8 text-purple-500" />
          Fale com Alice
        </h2>
        <Button 
          variant="outline" 
          onClick={startNewSession}
          disabled={isLoading}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Nova Conversa
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 h-[calc(100vh-200px)]">
        {/* Chat Area */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-purple-500" />
                Chat com Alice
              </div>
              <Badge variant={isLoading ? "secondary" : "default"} className="flex items-center gap-1">
                {isLoading ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <MessageCircle className="h-3 w-3" />
                    Online
                  </>
                )}
              </Badge>
            </CardTitle>
          </CardHeader>
          
          <CardContent className="flex-1 flex flex-col p-0">
            <ScrollArea className="flex-1 px-6 max-h-[calc(100vh-300px)]">
              <div className="space-y-4 py-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${
                      message.type === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div className="flex gap-3 max-w-3xl">
                      {message.type !== "user" && (
                        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white ${
                          message.type === "error" ? "bg-red-500" : "bg-purple-500"
                        }`}>
                          {message.type === "error" ? "!" : <Bot className="h-4 w-4" />}
                        </div>
                      )}
                      
                      <div className="space-y-2">
                        <div
                          className={`p-4 rounded-lg ${
                            message.type === "user"
                              ? "bg-blue-500 text-white ml-auto"
                              : message.type === "error"
                              ? "bg-red-50 border border-red-200"
                              : "bg-gray-50 border"
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{message.content}</p>
                        </div>
                        
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{formatTime(message.timestamp)}</span>
                        </div>

                      </div>
                      
                      {message.type === "user" && (
                        <div className="flex-shrink-0 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white">
                          <User className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
            
            <Separator />
            
            <div className="p-6">
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  placeholder="Digite sua pergunta aqui..."
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={isLoading}
                  className="flex-1"
                />
                <Button 
                  onClick={sendMessage} 
                  disabled={isLoading || !inputMessage.trim()}
                  size="icon"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}