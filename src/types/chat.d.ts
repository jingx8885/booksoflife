// Chat and Reading Assistant Type Definitions for BooksOfLife

/**
 * Chat message structure
 */
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  isStreaming?: boolean
  metadata?: {
    /** Message processing time */
    processingTime?: number
    /** AI model used for generation */
    model?: string
    /** Provider used */
    provider?: string
    /** Token usage */
    tokens?: {
      input: number
      output: number
    }
    /** Context information */
    context?: ReadingContext
  }
}

/**
 * Chat session for conversation history
 */
export interface ChatSession {
  id: string
  title: string
  bookId: string
  bookTitle: string
  chapter?: string
  chapterTitle?: string
  messageCount: number
  lastMessageAt: Date
  createdAt: Date
  preview?: string
  tags?: string[]
  isArchived?: boolean
}

/**
 * Reading context for AI assistant
 */
export interface ReadingContext {
  bookId: string
  bookTitle: string
  author?: string
  chapter?: string
  chapterTitle?: string
  pageNumber?: number
  selectedText?: string
  position?: {
    start: number
    end: number
  }
  metadata?: {
    genre?: string
    language?: string
    publicationYear?: number
  }
}

/**
 * Book context alias for compatibility
 */
export type BookContext = ReadingContext

/**
 * Chat state management
 */
export interface ChatState {
  messages: ChatMessage[]
  isLoading: boolean
  isTyping: boolean
  currentSessionId: string | null
  sessions: ChatSession[]
  error?: string
}

/**
 * Quick action definitions
 */
export interface QuickAction {
  id: string
  label: string
  icon: string
  prompt: string
  category: 'analysis' | 'comprehension' | 'creative' | 'navigation'
}

/**
 * AI assistant configuration
 */
export interface AIAssistantConfig {
  /** Maximum messages to keep in memory */
  maxMessages?: number
  /** Context window size for AI requests */
  contextWindow?: number
  /** Default AI model to use */
  defaultModel?: string
  /** Whether to enable quick actions */
  enableQuickActions?: boolean
  /** Whether to show typing indicators */
  showTypingIndicators?: boolean
  /** Auto-save interval for conversations */
  autoSaveInterval?: number
}

/**
 * Chat input configuration
 */
export interface ChatInputConfig {
  placeholder?: string
  maxLength?: number
  enableVoiceInput?: boolean
  showCharacterCount?: boolean
  quickActionsEnabled?: boolean
}

/**
 * Chat message with streaming support
 */
export interface StreamingChatMessage extends ChatMessage {
  isComplete: boolean
  chunks?: string[]
}

/**
 * Chat response from AI service
 */
export interface ChatResponse {
  message: ChatMessage
  usage?: {
    inputTokens: number
    outputTokens: number
    totalTokens: number
  }
  processingTime: number
  model: string
  provider: string
}

/**
 * Chat request to AI service
 */
export interface ChatRequest {
  messages: ChatMessage[]
  context: ReadingContext
  config?: {
    model?: string
    maxTokens?: number
    temperature?: number
    stream?: boolean
  }
}

/**
 * Chat history filters
 */
export interface ChatHistoryFilters {
  bookId?: string
  dateRange?: {
    start: Date
    end: Date
  }
  searchQuery?: string
  tags?: string[]
  archived?: boolean
}

/**
 * Chat analytics data
 */
export interface ChatAnalytics {
  totalSessions: number
  totalMessages: number
  averageMessagesPerSession: number
  mostActiveBooks: Array<{
    bookId: string
    bookTitle: string
    sessionCount: number
  }>
  popularQuestions: Array<{
    question: string
    frequency: number
  }>
  usageByTimeOfDay: Record<number, number>
  responseTimeMetrics: {
    average: number
    median: number
    p95: number
  }
}

/**
 * Chat export format
 */
export interface ChatExport {
  session: ChatSession
  messages: ChatMessage[]
  context: ReadingContext
  exportedAt: Date
  format: 'json' | 'markdown' | 'pdf'
}

/**
 * Chat notification settings
 */
export interface ChatNotificationSettings {
  newMessage: boolean
  sessionReminders: boolean
  analysisComplete: boolean
  soundEnabled: boolean
}

/**
 * Error types for chat functionality
 */
export class ChatError extends Error {
  constructor(
    message: string,
    public readonly code: ChatErrorCode,
    public readonly retryable: boolean = false,
    public readonly originalError?: Error
  ) {
    super(message)
    this.name = 'ChatError'
  }
}

export type ChatErrorCode =
  | 'RATE_LIMIT_EXCEEDED'
  | 'CONTEXT_TOO_LARGE'
  | 'INVALID_MESSAGE'
  | 'SESSION_NOT_FOUND'
  | 'STORAGE_ERROR'
  | 'AI_SERVICE_ERROR'
  | 'NETWORK_ERROR'
  | 'AUTHENTICATION_ERROR'

/**
 * Chat event types for real-time updates
 */
export type ChatEvent =
  | { type: 'message_sent'; payload: ChatMessage }
  | { type: 'message_received'; payload: ChatMessage }
  | { type: 'typing_start'; payload: { sessionId: string } }
  | { type: 'typing_stop'; payload: { sessionId: string } }
  | { type: 'session_created'; payload: ChatSession }
  | { type: 'session_updated'; payload: ChatSession }
  | { type: 'session_deleted'; payload: { sessionId: string } }
  | { type: 'error'; payload: ChatError }

/**
 * Chat hooks return types
 */
export interface UseChatReturn {
  messages: ChatMessage[]
  sessions: ChatSession[]
  currentSession: ChatSession | null
  isLoading: boolean
  isTyping: boolean
  error: string | null
  sendMessage: (content: string) => Promise<void>
  createSession: () => Promise<ChatSession>
  selectSession: (sessionId: string) => Promise<void>
  deleteSession: (sessionId: string) => Promise<void>
  clearMessages: () => void
  exportSession: (sessionId: string, format: 'json' | 'markdown' | 'pdf') => Promise<ChatExport>
}

export interface UseAIAssistantReturn extends UseChatReturn {
  context: ReadingContext
  updateContext: (context: Partial<ReadingContext>) => void
  quickActions: QuickAction[]
  executeQuickAction: (actionId: string) => Promise<void>
}

/**
 * Chat storage interface
 */
export interface ChatStorage {
  saveSession: (session: ChatSession) => Promise<void>
  loadSession: (sessionId: string) => Promise<ChatSession | null>
  saveMessages: (sessionId: string, messages: ChatMessage[]) => Promise<void>
  loadMessages: (sessionId: string) => Promise<ChatMessage[]>
  deleteSession: (sessionId: string) => Promise<void>
  listSessions: (filters?: ChatHistoryFilters) => Promise<ChatSession[]>
  clearAll: () => Promise<void>
}