"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ChatMessage, TypingIndicator, ChatMessage as ChatMessageType } from "@/components/ui/chat-message"
import { ChatInputWrapper } from "@/components/ui/chat-input"
import { ChatHistory, ChatSession, ChatHistoryMobile } from "@/components/ui/chat-history"
import { cn } from "@/lib/utils"
import {
  MessageSquare,
  Sparkles,
  History,
  Minimize2,
  Maximize2,
  X,
  Menu,
  BookOpen,
  Brain,
  Lightbulb,
} from "lucide-react"

export interface ReadingContext {
  bookId: string
  bookTitle: string
  chapter?: string
  chapterTitle?: string
  pageNumber?: number
  selectedText?: string
}

export interface AIAssistantProps {
  readingContext: ReadingContext
  className?: string
  defaultCollapsed?: boolean
}

interface ChatState {
  messages: ChatMessageType[]
  isLoading: boolean
  currentSessionId: string | null
  sessions: ChatSession[]
  isTyping: boolean
}

export function AIAssistant({
  readingContext,
  className,
  defaultCollapsed = false,
}: AIAssistantProps) {
  const [isCollapsed, setIsCollapsed] = React.useState(defaultCollapsed)
  const [showHistory, setShowHistory] = React.useState(false)
  const [isMobileHistoryOpen, setIsMobileHistoryOpen] = React.useState(false)
  
  const [chatState, setChatState] = React.useState<ChatState>({
    messages: [],
    isLoading: false,
    currentSessionId: null,
    sessions: [],
    isTyping: false,
  })

  const messagesEndRef = React.useRef<HTMLDivElement>(null)
  const messagesContainerRef = React.useRef<HTMLDivElement>(null)

  // Auto scroll to bottom when new messages arrive
  const scrollToBottom = React.useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [])

  React.useEffect(() => {
    scrollToBottom()
  }, [chatState.messages, chatState.isTyping, scrollToBottom])

  // Handle sending messages
  const handleSendMessage = React.useCallback(async (content: string) => {
    if (chatState.isLoading) return

    const userMessage: ChatMessageType = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date(),
    }

    setChatState(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      isLoading: true,
      isTyping: true,
    }))

    try {
      // TODO: Implement actual AI service call
      // This is a mock implementation for now
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000))

      const assistantMessage: ChatMessageType = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: `I understand you're asking about: "${content}". Based on what you're reading in "${readingContext.bookTitle}"${readingContext.chapter ? ` (${readingContext.chapter})` : ''}, I can help explain concepts, summarize content, or answer specific questions. This is a mock response that will be replaced with actual AI integration.`,
        timestamp: new Date(),
      }

      setChatState(prev => ({
        ...prev,
        messages: [...prev.messages, assistantMessage],
        isLoading: false,
        isTyping: false,
      }))

      // Update session if exists or create new one
      if (!chatState.currentSessionId) {
        const newSession: ChatSession = {
          id: `session-${Date.now()}`,
          title: content.length > 50 ? `${content.substring(0, 50)}...` : content,
          bookTitle: readingContext.bookTitle,
          chapter: readingContext.chapter,
          messageCount: 2,
          lastMessageAt: new Date(),
          createdAt: new Date(),
          preview: content,
        }

        setChatState(prev => ({
          ...prev,
          currentSessionId: newSession.id,
          sessions: [newSession, ...prev.sessions],
        }))
      } else {
        setChatState(prev => ({
          ...prev,
          sessions: prev.sessions.map(session =>
            session.id === prev.currentSessionId
              ? {
                  ...session,
                  messageCount: prev.messages.length + 1,
                  lastMessageAt: new Date(),
                }
              : session
          ),
        }))
      }
    } catch (error) {
      console.error('Failed to send message:', error)
      setChatState(prev => ({
        ...prev,
        isLoading: false,
        isTyping: false,
      }))
    }
  }, [chatState.isLoading, chatState.currentSessionId, readingContext])

  // Handle session selection
  const handleSessionSelect = React.useCallback((sessionId: string) => {
    // TODO: Load session messages from storage/API
    setChatState(prev => ({
      ...prev,
      currentSessionId: sessionId,
      messages: [], // Would load actual messages here
    }))
    setShowHistory(false)
    setIsMobileHistoryOpen(false)
  }, [])

  // Handle session deletion
  const handleSessionDelete = React.useCallback((sessionId: string) => {
    setChatState(prev => ({
      ...prev,
      sessions: prev.sessions.filter(session => session.id !== sessionId),
      currentSessionId: prev.currentSessionId === sessionId ? null : prev.currentSessionId,
      messages: prev.currentSessionId === sessionId ? [] : prev.messages,
    }))
  }, [])

  // Handle new session
  const handleNewSession = React.useCallback(() => {
    setChatState(prev => ({
      ...prev,
      currentSessionId: null,
      messages: [],
    }))
    setShowHistory(false)
    setIsMobileHistoryOpen(false)
  }, [])

  if (isCollapsed) {
    return (
      <Card className={cn("fixed bottom-4 right-4 w-14 h-14 z-40", className)}>
        <Button
          onClick={() => setIsCollapsed(false)}
          className="w-full h-full rounded-lg bg-primary hover:bg-primary/90"
          size="icon"
        >
          <Sparkles className="size-6" />
          <span className="sr-only">Open AI Assistant</span>
        </Button>
      </Card>
    )
  }

  return (
    <div className={cn("flex h-full", className)}>
      {/* Main Chat Interface */}
      <Card className="flex-1 flex flex-col min-h-0">
        {/* Header */}
        <CardHeader className="pb-3 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <Brain className="size-5 text-primary" />
                <CardTitle className="text-base">AI Reading Assistant</CardTitle>
              </div>
              
              {/* Context indicator */}
              <Badge variant="secondary" className="text-xs">
                <BookOpen className="size-3 mr-1" />
                {readingContext.chapter || readingContext.bookTitle}
              </Badge>
            </div>

            <div className="flex items-center gap-1">
              {/* Mobile history toggle */}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setIsMobileHistoryOpen(true)}
              >
                <Menu className="size-4" />
                <span className="sr-only">Open chat history</span>
              </Button>

              {/* Desktop history toggle */}
              <Button
                variant="ghost"
                size="icon"
                className="hidden md:inline-flex"
                onClick={() => setShowHistory(!showHistory)}
              >
                <History className="size-4" />
                <span className="sr-only">Toggle chat history</span>
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsCollapsed(true)}
              >
                <Minimize2 className="size-4" />
                <span className="sr-only">Minimize assistant</span>
              </Button>
            </div>
          </div>

          {/* Current context display */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Lightbulb className="size-3" />
            <span>
              Reading: {readingContext.bookTitle}
              {readingContext.chapter && ` • ${readingContext.chapter}`}
              {readingContext.pageNumber && ` • Page ${readingContext.pageNumber}`}
            </span>
          </div>
        </CardHeader>

        {/* Messages Container */}
        <CardContent className="flex-1 overflow-hidden p-0 flex flex-col min-h-0">
          {chatState.messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
              <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Sparkles className="size-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">AI Reading Assistant</h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-sm">
                Ask questions about what you're reading, request summaries, or explore key concepts.
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSendMessage("Summarize this chapter")}
                  disabled={chatState.isLoading}
                >
                  Summarize Chapter
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSendMessage("What are the key concepts?")}
                  disabled={chatState.isLoading}
                >
                  Key Concepts
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSendMessage("Generate discussion questions")}
                  disabled={chatState.isLoading}
                >
                  Discussion Questions
                </Button>
              </div>
            </div>
          ) : (
            <div
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto"
            >
              {chatState.messages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))}
              
              {chatState.isTyping && <TypingIndicator />}
              
              <div ref={messagesEndRef} />
            </div>
          )}
        </CardContent>

        {/* Input */}
        <ChatInputWrapper
          onSendMessage={handleSendMessage}
          disabled={chatState.isLoading}
          isLoading={chatState.isLoading}
          showQuickActions={chatState.messages.length === 0}
        />
      </Card>

      {/* Desktop History Sidebar */}
      {showHistory && (
        <>
          <Separator orientation="vertical" className="mx-0" />
          <div className="w-80 hidden md:block">
            <ChatHistory
              sessions={chatState.sessions}
              currentSessionId={chatState.currentSessionId}
              onSessionSelect={handleSessionSelect}
              onSessionDelete={handleSessionDelete}
              onNewSession={handleNewSession}
              className="h-full border-0 rounded-none"
            />
          </div>
        </>
      )}

      {/* Mobile History Modal */}
      <ChatHistoryMobile
        isOpen={isMobileHistoryOpen}
        onClose={() => setIsMobileHistoryOpen(false)}
        sessions={chatState.sessions}
        currentSessionId={chatState.currentSessionId}
        onSessionSelect={handleSessionSelect}
        onSessionDelete={handleSessionDelete}
        onNewSession={handleNewSession}
      />
    </div>
  )
}

export default AIAssistant