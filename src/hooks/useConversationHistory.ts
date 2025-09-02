/**
 * Conversation History Hook for BooksOfLife Chat System
 */
import { useState, useEffect, useCallback } from 'react'
import type { 
  ChatSession, 
  ChatMessage, 
  ChatHistoryFilters 
} from '@/types/chat'

export interface UseConversationHistoryOptions {
  autoLoad?: boolean
  pageSize?: number
  bookId?: string
}

export interface UseConversationHistoryReturn {
  sessions: ChatSession[]
  isLoading: boolean
  error: string | null
  hasMore: boolean
  loadSessions: (filters?: ChatHistoryFilters) => Promise<void>
  loadMore: () => Promise<void>
  searchSessions: (query: string) => Promise<void>
  refreshSessions: () => Promise<void>
  deleteSession: (sessionId: string) => Promise<void>
  archiveSession: (sessionId: string) => Promise<void>
  unarchiveSession: (sessionId: string) => Promise<void>
  exportSession: (sessionId: string, format: 'json' | 'markdown' | 'pdf') => Promise<Blob>
  getSessionMessages: (sessionId: string) => Promise<ChatMessage[]>
}

export function useConversationHistory(
  options: UseConversationHistoryOptions = {}
): UseConversationHistoryReturn {
  const { autoLoad = true, pageSize = 20, bookId } = options

  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [currentPage, setCurrentPage] = useState(0)
  const [currentFilters, setCurrentFilters] = useState<ChatHistoryFilters | undefined>()

  // Load conversation sessions
  const loadSessions = useCallback(async (filters?: ChatHistoryFilters): Promise<void> => {
    setIsLoading(true)
    setError(null)
    setCurrentFilters(filters)
    setCurrentPage(0)

    try {
      const queryParams = new URLSearchParams()
      queryParams.set('page', '0')
      queryParams.set('limit', pageSize.toString())
      
      if (bookId || filters?.bookId) {
        queryParams.set('bookId', bookId || filters!.bookId!)
      }
      
      if (filters?.searchQuery) {
        queryParams.set('search', filters.searchQuery)
      }
      
      if (filters?.archived !== undefined) {
        queryParams.set('archived', filters.archived.toString())
      }
      
      if (filters?.dateRange) {
        queryParams.set('startDate', filters.dateRange.start.toISOString())
        queryParams.set('endDate', filters.dateRange.end.toISOString())
      }

      const response = await fetch(`/api/conversations?${queryParams}`)
      
      if (!response.ok) {
        throw new Error(`Failed to load sessions: ${response.status}`)
      }

      const data = await response.json()
      setSessions(data.sessions || [])
      setHasMore(data.hasMore || false)
      setCurrentPage(1)

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load conversation history'
      setError(errorMessage)
      console.error('Error loading sessions:', err)
    } finally {
      setIsLoading(false)
    }
  }, [pageSize, bookId])

  // Load more sessions (pagination)
  const loadMore = useCallback(async (): Promise<void> => {
    if (isLoading || !hasMore) return

    setIsLoading(true)
    setError(null)

    try {
      const queryParams = new URLSearchParams()
      queryParams.set('page', currentPage.toString())
      queryParams.set('limit', pageSize.toString())
      
      if (bookId || currentFilters?.bookId) {
        queryParams.set('bookId', bookId || currentFilters!.bookId!)
      }
      
      if (currentFilters?.searchQuery) {
        queryParams.set('search', currentFilters.searchQuery)
      }
      
      if (currentFilters?.archived !== undefined) {
        queryParams.set('archived', currentFilters.archived.toString())
      }

      const response = await fetch(`/api/conversations?${queryParams}`)
      
      if (!response.ok) {
        throw new Error(`Failed to load more sessions: ${response.status}`)
      }

      const data = await response.json()
      setSessions(prev => [...prev, ...(data.sessions || [])])
      setHasMore(data.hasMore || false)
      setCurrentPage(prev => prev + 1)

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load more sessions'
      setError(errorMessage)
      console.error('Error loading more sessions:', err)
    } finally {
      setIsLoading(false)
    }
  }, [currentPage, pageSize, bookId, currentFilters, isLoading, hasMore])

  // Search sessions
  const searchSessions = useCallback(async (query: string): Promise<void> => {
    await loadSessions({ 
      ...currentFilters, 
      searchQuery: query.trim() || undefined 
    })
  }, [loadSessions, currentFilters])

  // Refresh sessions
  const refreshSessions = useCallback(async (): Promise<void> => {
    await loadSessions(currentFilters)
  }, [loadSessions, currentFilters])

  // Delete session
  const deleteSession = useCallback(async (sessionId: string): Promise<void> => {
    try {
      const response = await fetch(`/api/conversations/${sessionId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error(`Failed to delete session: ${response.status}`)
      }

      setSessions(prev => prev.filter(session => session.id !== sessionId))

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete session'
      setError(errorMessage)
      throw err
    }
  }, [])

  // Archive session
  const archiveSession = useCallback(async (sessionId: string): Promise<void> => {
    try {
      const response = await fetch(`/api/conversations/${sessionId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isArchived: true }),
      })

      if (!response.ok) {
        throw new Error(`Failed to archive session: ${response.status}`)
      }

      setSessions(prev => 
        prev.map(session => 
          session.id === sessionId 
            ? { ...session, isArchived: true }
            : session
        )
      )

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to archive session'
      setError(errorMessage)
      throw err
    }
  }, [])

  // Unarchive session
  const unarchiveSession = useCallback(async (sessionId: string): Promise<void> => {
    try {
      const response = await fetch(`/api/conversations/${sessionId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isArchived: false }),
      })

      if (!response.ok) {
        throw new Error(`Failed to unarchive session: ${response.status}`)
      }

      setSessions(prev => 
        prev.map(session => 
          session.id === sessionId 
            ? { ...session, isArchived: false }
            : session
        )
      )

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to unarchive session'
      setError(errorMessage)
      throw err
    }
  }, [])

  // Export session
  const exportSession = useCallback(async (sessionId: string, format: 'json' | 'markdown' | 'pdf'): Promise<Blob> => {
    try {
      const response = await fetch(`/api/conversations/${sessionId}/export?format=${format}`)
      
      if (!response.ok) {
        throw new Error(`Failed to export session: ${response.status}`)
      }

      return await response.blob()

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to export session'
      setError(errorMessage)
      throw err
    }
  }, [])

  // Get messages for a specific session
  const getSessionMessages = useCallback(async (sessionId: string): Promise<ChatMessage[]> => {
    try {
      const response = await fetch(`/api/conversations/${sessionId}/messages`)
      
      if (!response.ok) {
        throw new Error(`Failed to load messages: ${response.status}`)
      }

      const data = await response.json()
      return data.messages || []

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load messages'
      setError(errorMessage)
      throw err
    }
  }, [])

  // Auto-load sessions on mount
  useEffect(() => {
    if (autoLoad) {
      loadSessions({ bookId })
    }
  }, [autoLoad, bookId, loadSessions])

  return {
    sessions,
    isLoading,
    error,
    hasMore,
    loadSessions,
    loadMore,
    searchSessions,
    refreshSessions,
    deleteSession,
    archiveSession,
    unarchiveSession,
    exportSession,
    getSessionMessages,
  }
}