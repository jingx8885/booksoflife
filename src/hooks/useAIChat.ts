/**
 * AI Chat Hook for BooksOfLife Reading Assistant
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import type {
  ChatMessage,
  ChatSession,
  ReadingContext,
  ChatResponse,
  UseChatReturn,
  ChatError
} from '@/types/chat'

export interface UseAIChatOptions {
  bookContext?: ReadingContext
  autoSave?: boolean
  maxMessages?: number
}

export function useAIChat(options: UseAIChatOptions = {}): UseChatReturn {
  const { bookContext, autoSave = true, maxMessages = 100 } = options
  
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const abortControllerRef = useRef<AbortController | null>(null)

  // Send message to AI
  const sendMessage = useCallback(async (content: string): Promise<void> => {
    if (!content.trim()) return

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)
    setError(null)

    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          context: bookContext,
        }),
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const chatResponse: ChatResponse = await response.json()
      
      setMessages(prev => [...prev, chatResponse.message])
      
      if (autoSave && currentSession) {
        // Auto-save session would be implemented here
        console.log('Auto-saving session:', currentSession.id)
      }
      
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return // Request was cancelled
      }
      
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      
      // Add error message to chat
      const errorChatMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, errorChatMessage])
      
    } finally {
      setIsLoading(false)
      abortControllerRef.current = null
    }
  }, [messages, bookContext, autoSave, currentSession])

  // Create new chat session
  const createSession = useCallback(async (): Promise<ChatSession> => {
    const newSession: ChatSession = {
      id: crypto.randomUUID(),
      title: 'New Chat',
      bookId: bookContext?.bookId || 'unknown',
      bookTitle: bookContext?.bookTitle || 'Unknown Book',
      chapter: bookContext?.chapter,
      chapterTitle: bookContext?.chapterTitle,
      messageCount: 0,
      lastMessageAt: new Date(),
      createdAt: new Date(),
    }

    setSessions(prev => [newSession, ...prev])
    setCurrentSession(newSession)
    setMessages([])
    setError(null)

    return newSession
  }, [bookContext])

  // Select existing session
  const selectSession = useCallback(async (sessionId: string): Promise<void> => {
    const session = sessions.find(s => s.id === sessionId)
    if (!session) {
      throw new Error('Session not found')
    }

    setCurrentSession(session)
    // Load messages for this session - would implement actual loading here
    setMessages([])
    setError(null)
  }, [sessions])

  // Delete session
  const deleteSession = useCallback(async (sessionId: string): Promise<void> => {
    setSessions(prev => prev.filter(s => s.id !== sessionId))
    
    if (currentSession?.id === sessionId) {
      setCurrentSession(null)
      setMessages([])
    }
  }, [currentSession])

  // Clear current session messages
  const clearMessages = useCallback((): void => {
    setMessages([])
    setError(null)
  }, [])

  // Export session
  const exportSession = useCallback(async (sessionId: string, format: 'json' | 'markdown' | 'pdf') => {
    const session = sessions.find(s => s.id === sessionId)
    if (!session) {
      throw new Error('Session not found')
    }

    // Would implement actual export logic here
    return {
      session,
      messages,
      context: bookContext || {} as ReadingContext,
      exportedAt: new Date(),
      format,
    }
  }, [sessions, messages, bookContext])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  return {
    messages,
    sessions,
    currentSession,
    isLoading,
    isTyping,
    error,
    sendMessage,
    createSession,
    selectSession,
    deleteSession,
    clearMessages,
    exportSession,
  }
}