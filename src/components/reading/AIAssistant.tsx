"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ChatMessage, TypingIndicator, ChatMessage as ChatMessageType } from "@/components/ui/chat-message"
import { ChatInputWrapper } from "@/components/ui/chat-input"
import { ChatHistory, ChatSession, ChatHistoryMobile } from "@/components/ui/chat-history"
import { useAIChat } from "@/hooks/useAIChat"
import { useConversationHistory } from "@/hooks/useConversationHistory"
import type { BookContext } from "@/types/chat"
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
  AlertCircle,
  Zap,
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

export function AIAssistant({
  readingContext,
  className,
  defaultCollapsed = false,
}: AIAssistantProps) {
  const [isCollapsed, setIsCollapsed] = React.useState(defaultCollapsed)
  const [showHistory, setShowHistory] = React.useState(false)
  const [isMobileHistoryOpen, setIsMobileHistoryOpen] = React.useState(false)

  const messagesEndRef = React.useRef<HTMLDivElement>(null)
  const messagesContainerRef = React.useRef<HTMLDivElement>(null)

  // Convert ReadingContext to BookContext for hooks
  const bookContext: BookContext = React.useMemo(() => ({
    bookUuid: readingContext.bookId,
    title: readingContext.bookTitle,
    author: "", // Not provided in ReadingContext
    currentChapter: readingContext.chapter || readingContext.chapterTitle,
    currentPage: readingContext.pageNumber,
    genre: "",
    selectedText: readingContext.selectedText
  }), [readingContext])

  // Integration with Stream B hooks
  const {
    messages,
    isLoading,
    error,
    connectionStatus,
    currentConversationId,
    sendMessage,
    sendStreamingMessage,
    clearMessages,
    cancelRequest,
    retryLastMessage
  } = useAIChat({
    bookContext,
    enableStreaming: true,
    autoRetry: true,
    maxRetries: 3,
    preferences: {
      responseStyle: 'balanced',
      includeExamples: true
    }
  })

  const {
    conversations,
    isLoading: historyLoading,
    loadConversations,
    loadConversation,
    deleteConversation,
    createNewConversation,
    exportConversations,
    importConversations
  } = useConversationHistory({
    bookUuid: readingContext.bookId,
    autoLoad: true
  })

  // Auto scroll to bottom when new messages arrive
  const scrollToBottom = React.useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [])

  React.useEffect(() => {
    scrollToBottom()
  }, [messages, isLoading, scrollToBottom])

  // Handle sending messages using real hooks
  const handleSendMessage = React.useCallback(async (content: string) => {
    if (isLoading) return

    try {
      // Use the streaming message hook for real-time responses
      await sendStreamingMessage(content)
    } catch (error) {
      console.error('Failed to send message:', error)
    }
  }, [isLoading, sendStreamingMessage])

  // Handle session selection using real hooks
  const handleSessionSelect = React.useCallback(async (sessionId: string) => {
    try {
      await loadConversation(sessionId)
      setShowHistory(false)
      setIsMobileHistoryOpen(false)
    } catch (error) {
      console.error('Failed to load conversation:', error)
    }
  }, [loadConversation])

  // Handle session deletion using real hooks
  const handleSessionDelete = React.useCallback(async (sessionId: string) => {
    try {
      await deleteConversation(sessionId)
    } catch (error) {
      console.error('Failed to delete conversation:', error)
    }
  }, [deleteConversation])

  // Handle new session using real hooks
  const handleNewSession = React.useCallback(async () => {
    try {
      await createNewConversation(bookContext)
      clearMessages()
      setShowHistory(false)
      setIsMobileHistoryOpen(false)
    } catch (error) {
      console.error('Failed to create new conversation:', error)
    }
  }, [createNewConversation, clearMessages, bookContext])

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

              {/* Connection Status */}
              <Badge variant={connectionStatus === 'connected' ? 'default' : 'secondary'} className="text-xs">
                {connectionStatus === 'connected' ? (
                  <><Zap className="size-3 mr-1" /> 已连接</>
                ) : connectionStatus === 'connecting' ? (
                  <><Zap className="size-3 mr-1 animate-pulse" /> 连接中...</>
                ) : (
                  <><AlertCircle className="size-3 mr-1" /> 已断开</>
                )}
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
          {messages.length === 0 ? (
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
                  disabled={isLoading || connectionStatus !== 'connected'}
                >
                  Summarize Chapter
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSendMessage("What are the key concepts?")}
                  disabled={isLoading || connectionStatus !== 'connected'}
                >
                  Key Concepts
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSendMessage("Generate discussion questions")}
                  disabled={isLoading || connectionStatus !== 'connected'}
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
              {messages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))}
              
              {isLoading && <TypingIndicator />}

              {/* Error Display */}
              {error && (
                <div className="p-4 text-center">
                  <div className="inline-flex items-center gap-2 text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                    <AlertCircle className="size-4" />
                    <span>{error}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={retryLastMessage}
                      className="ml-2"
                    >
                      重试
                    </Button>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          )}
        </CardContent>

        {/* Input */}
        <ChatInputWrapper
          onSendMessage={handleSendMessage}
          disabled={isLoading || connectionStatus !== 'connected'}
          isLoading={isLoading}
          showQuickActions={messages.length === 0}
        />
      </Card>

      {/* Desktop History Sidebar */}
      {showHistory && (
        <>
          <Separator orientation="vertical" className="mx-0" />
          <div className="w-80 hidden md:block">
            <ChatHistory
              sessions={conversations.map(conv => ({
                id: conv.uuid,
                title: conv.title,
                bookTitle: conv.context_data?.title || readingContext.bookTitle,
                chapter: conv.context_data?.currentChapter,
                messageCount: conv.total_messages,
                lastMessageAt: new Date(conv.last_message_at || conv.created_at),
                createdAt: new Date(conv.created_at),
                preview: conv.context_data?.preview
              }))}
              currentSessionId={currentConversationId}
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
        sessions={conversations.map(conv => ({
          id: conv.uuid,
          title: conv.title,
          bookTitle: conv.context_data?.title || readingContext.bookTitle,
          chapter: conv.context_data?.currentChapter,
          messageCount: conv.total_messages,
          lastMessageAt: new Date(conv.last_message_at || conv.created_at),
          createdAt: new Date(conv.created_at),
          preview: conv.context_data?.preview
        }))}
        currentSessionId={currentConversationId}
        onSessionSelect={handleSessionSelect}
        onSessionDelete={handleSessionDelete}
        onNewSession={handleNewSession}
      />
    </div>
  )
}

export default AIAssistant