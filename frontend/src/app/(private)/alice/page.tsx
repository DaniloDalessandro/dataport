"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Bot,
  Send,
  User,
  Sparkles,
  Database,
  TrendingUp,
  BarChart3,
  Info
} from "lucide-react"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

// Simulated responses based on dataset context
const getAliceResponse = (question: string): string => {
  const lowerQuestion = question.toLowerCase()

  // Dataset overview questions
  if (lowerQuestion.includes("quantos datasets") || lowerQuestion.includes("total de datasets")) {
    return "Temos **68 datasets no total** no sistema. Destes, **45 estão ativos** e em uso regular, 12 foram arquivados, 8 estão em processamento e 3 estão pendentes de validação."
  }

  if (lowerQuestion.includes("armazenamento") || lowerQuestion.includes("espaço")) {
    return "O sistema está utilizando **18,75 TB** de armazenamento, o que representa 78% do total disponível. Recomendo monitorar este uso, pois estamos nos aproximando do limite de capacidade."
  }

  if (lowerQuestion.includes("registros") || lowerQuestion.includes("dados totais")) {
    return "Temos um total de **2,4 milhões de registros** distribuídos entre todos os datasets. Este número representa um crescimento de 8% em relação ao mês anterior."
  }

  // Growth and trends
  if (lowerQuestion.includes("crescimento") || lowerQuestion.includes("evolução")) {
    return "O sistema apresenta um **crescimento de 12%** no último mês. O volume de dados tem aumentado consistentemente, especialmente nos datasets relacionados a transações e logs de sistema."
  }

  if (lowerQuestion.includes("tendência") || lowerQuestion.includes("trend")) {
    return "A tendência atual mostra um crescimento estável no volume de dados. Os últimos 6 meses apresentaram aumento médio de **315K GB por mês**. Junho foi o mês com maior volume (420K GB)."
  }

  // Dataset status
  if (lowerQuestion.includes("status") || lowerQuestion.includes("estado")) {
    return "Dos 68 datasets:\n- **45 (66%)** estão ativos e em uso regular\n- **12 (18%)** foram arquivados\n- **8 (12%)** estão sendo processados\n- **3 (4%)** estão pendentes de validação"
  }

  if (lowerQuestion.includes("processamento") || lowerQuestion.includes("processando")) {
    return "Há **8 datasets em processamento** no momento. O tempo médio de processamento é de 2-4 horas dependendo do tamanho do arquivo. Você pode acompanhar o status na página de Datasets."
  }

  // Data quality
  if (lowerQuestion.includes("qualidade") || lowerQuestion.includes("quality")) {
    return "A qualidade geral dos dados está em **bom nível**. A maioria dos datasets ativos passa por validação automática e apresenta consistência acima de 95%. Datasets com problemas são sinalizados automaticamente."
  }

  // Monthly data
  if (lowerQuestion.includes("mês") || lowerQuestion.includes("mensal") || lowerQuestion.includes("monthly")) {
    return "**Dados mensais recentes:**\n- Janeiro: 245K GB (12 datasets)\n- Fevereiro: 280K GB (15 datasets)\n- Março: 320K GB (18 datasets)\n- Abril: 290K GB (14 datasets)\n- Maio: 350K GB (21 datasets)\n- Junho: 420K GB (25 datasets)"
  }

  // Help and capabilities
  if (lowerQuestion.includes("ajuda") || lowerQuestion.includes("help") || lowerQuestion.includes("o que você faz") || lowerQuestion.includes("como funciona")) {
    return "Olá! Sou a **Alice**, sua assistente virtual do DataPort. Posso ajudar você com:\n\n📊 **Análise de dados** - informações sobre datasets, volumes e estatísticas\n📈 **Tendências** - crescimento, evolução e padrões nos dados\n🔍 **Status** - situação atual dos datasets e processamentos\n💡 **Insights** - recomendações baseadas nos dados\n\nPergunte-me qualquer coisa sobre os datasets!"
  }

  // Recommendations
  if (lowerQuestion.includes("recomendação") || lowerQuestion.includes("sugestão") || lowerQuestion.includes("recomenda")) {
    return "**Recomendações baseadas nos dados atuais:**\n\n1. 📦 Considere arquivar datasets inativos há mais de 90 dias\n2. 💾 O armazenamento está em 78% - planeje expansão em breve\n3. ✅ Valide os 3 datasets pendentes para liberá-los para uso\n4. 📈 O crescimento está saudável - mantenha o monitoramento mensal"
  }

  // Default response
  return `Entendi sua pergunta sobre "${question}". Com base nos dados disponíveis nos datasets, posso fornecer informações sobre:\n\n- Volume total de dados e armazenamento\n- Status e distribuição dos datasets\n- Tendências de crescimento\n- Qualidade dos dados\n\nPoderia reformular sua pergunta ou me perguntar sobre algum destes tópicos específicos?`
}

export default function AlicePage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "Olá! 👋 Sou a **Alice**, sua assistente virtual do DataDock. Estou aqui para ajudar você a entender e analisar os dados dos seus datasets.\n\nPosso responder perguntas sobre:\n- 📊 Volume e armazenamento de dados\n- 📈 Tendências e crescimento\n- 🔍 Status dos datasets\n- 💡 Insights e recomendações\n\nComo posso ajudar você hoje?",
      timestamp: new Date()
    }
  ])
  const [input, setInput] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isTyping])

  const handleSend = () => {
    if (!input.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput("")
    setIsTyping(true)

    // Simulate AI thinking time
    setTimeout(() => {
      const response = getAliceResponse(input)
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, assistantMessage])
      setIsTyping(false)
    }, 1000 + Math.random() * 1000)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const quickQuestions = [
    "Quantos datasets temos?",
    "Como está o armazenamento?",
    "Qual a tendência de crescimento?",
    "Me dê recomendações"
  ]

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] gap-6 p-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
          <Bot className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            Alice
            <Sparkles className="h-5 w-5 text-purple-500" />
          </h1>
          <p className="text-sm text-gray-600">Assistente Virtual de Análise de Dados</p>
        </div>
      </div>

      {/* Chat Container */}
      <Card className="flex-1 flex flex-col border-2 shadow-lg">
        <CardContent className="flex-1 flex flex-col p-0">
          {/* Messages */}
          <ScrollArea className="flex-1 p-6" ref={scrollRef}>
            <div className="space-y-6">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${
                    message.role === "user" ? "flex-row-reverse" : "flex-row"
                  }`}
                >
                  <Avatar className={`h-10 w-10 flex-shrink-0 ${
                    message.role === "assistant"
                      ? "bg-gradient-to-br from-purple-500 to-blue-500"
                      : "bg-gradient-to-br from-gray-600 to-gray-800"
                  }`}>
                    <AvatarFallback className="text-white">
                      {message.role === "assistant" ? <Bot className="h-5 w-5" /> : <User className="h-5 w-5" />}
                    </AvatarFallback>
                  </Avatar>
                  <div
                    className={`flex-1 max-w-[80%] ${
                      message.role === "user" ? "text-right" : "text-left"
                    }`}
                  >
                    <div
                      className={`inline-block p-4 rounded-2xl ${
                        message.role === "user"
                          ? "bg-blue-500 text-white"
                          : "bg-gray-100 text-gray-900"
                      }`}
                    >
                      <div className="text-sm whitespace-pre-wrap" style={{
                        wordBreak: "break-word",
                        overflowWrap: "break-word"
                      }}>
                        {message.content.split('**').map((part, i) =>
                          i % 2 === 0 ? part : <strong key={i}>{part}</strong>
                        )}
                      </div>
                    </div>
                    <div className={`text-xs text-gray-500 mt-1 ${
                      message.role === "user" ? "text-right" : "text-left"
                    }`}>
                      {message.timestamp.toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </div>
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="flex gap-3">
                  <Avatar className="h-10 w-10 bg-gradient-to-br from-purple-500 to-blue-500">
                    <AvatarFallback className="text-white">
                      <Bot className="h-5 w-5" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="bg-gray-100 p-4 rounded-2xl">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Quick Questions */}
          {messages.length === 1 && (
            <div className="px-6 pb-4">
              <p className="text-xs text-gray-500 mb-2">Perguntas sugeridas:</p>
              <div className="flex flex-wrap gap-2">
                {quickQuestions.map((question, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setInput(question)
                    }}
                    className="text-xs hover:bg-purple-50 hover:border-purple-300"
                  >
                    {question}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="border-t p-4 bg-gray-50">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Faça uma pergunta sobre os datasets..."
                className="flex-1 bg-white"
                disabled={isTyping}
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || isTyping}
                className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
              <Info className="h-3 w-3" />
              A Alice analisa dados dos datasets para fornecer insights e responder suas perguntas
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Stats Footer */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-xs text-gray-600">Datasets Ativos</p>
                <p className="text-lg font-bold text-gray-900">45</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-50 to-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-purple-600" />
              <div>
                <p className="text-xs text-gray-600">Registros Totais</p>
                <p className="text-lg font-bold text-gray-900">2.4M</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-xs text-gray-600">Crescimento</p>
                <p className="text-lg font-bold text-gray-900">+12%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
