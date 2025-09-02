/**
 * AI Service for BooksOfLife Reading Assistant
 * 
 * This service provides a higher-level interface for the AI reading assistant,
 * built on top of the Task 3 AI infrastructure. It handles conversation context,
 * book-specific prompts, and integrates with the conversation persistence layer.
 */

import { 
  AIRequest, 
  AIResponse, 
  AIStreamChunk, 
  AIMessage,
  AIProvider,
} from '@/types/ai';
import { 
  getAIService, 
  initializeAIService, 
  streamAI,
  askAI,
  AIService as BaseAIService 
} from '@/services/ai';
import { getAIServiceConfig } from '@/services/ai/config';

/**
 * Book context for AI conversations
 */
export interface BookContext {
  /** Book UUID */
  bookUuid: string;
  /** Book title */
  title: string;
  /** Book author */
  author: string;
  /** Current chapter */
  currentChapter?: string;
  /** Current page */
  currentPage?: number;
  /** Reading session context */
  sessionContext?: {
    sessionUuid: string;
    startPage?: number;
    notes?: string;
    mood?: string;
  };
}

/**
 * Reading assistant request configuration
 */
export interface ReadingAssistantRequest {
  /** User message */
  message: string;
  /** Conversation history */
  conversationHistory: AIMessage[];
  /** Book context (optional) */
  bookContext?: BookContext;
  /** Context type */
  contextType?: 'general' | 'book_specific' | 'chapter_specific';
  /** Whether to stream response */
  stream?: boolean;
  /** User preferences */
  preferences?: {
    responseStyle?: 'casual' | 'academic' | 'detailed' | 'brief';
    language?: string;
    includeExamples?: boolean;
  };
}

/**
 * Reading assistant response
 */
export interface ReadingAssistantResponse {
  /** AI response content */
  content: string;
  /** AI provider used */
  provider: AIProvider;
  /** AI model used */
  model: string;
  /** Token usage */
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  /** Response metadata */
  metadata: {
    duration: number;
    timestamp: number;
    finishReason: string;
  };
  /** Generated conversation title (for new conversations) */
  suggestedTitle?: string;
}

/**
 * Reading Assistant AI Service
 */
export class ReadingAssistantAI {
  private baseService: BaseAIService;
  private initialized: boolean = false;

  constructor() {
    // Initialize with empty service - will be properly initialized later
    this.baseService = {} as BaseAIService;
  }

  /**
   * Initialize the reading assistant AI service
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    const config = await getAIServiceConfig();
    this.baseService = await initializeAIService(config);
    this.initialized = true;
  }

  /**
   * Ensure the service is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  /**
   * Generate a system prompt based on context
   */
  private generateSystemPrompt(
    contextType: string = 'general',
    bookContext?: BookContext,
    preferences?: ReadingAssistantRequest['preferences']
  ): string {
    let systemPrompt = `You are a helpful AI reading assistant for BooksOfLife. Your role is to assist readers with their reading experience by:

1. Answering questions about books and reading material
2. Providing insights and analysis about literary content
3. Helping with comprehension and interpretation
4. Offering reading recommendations and strategies
5. Discussing themes, characters, and plot elements
6. Assisting with note-taking and summarization

General guidelines:
- Be encouraging and supportive of the reader's learning journey
- Provide thoughtful, well-reasoned responses
- Ask clarifying questions when needed
- Respect different interpretations and reading preferences
- Focus on enhancing the reading experience`;

    // Add response style preferences
    if (preferences?.responseStyle) {
      switch (preferences.responseStyle) {
        case 'casual':
          systemPrompt += '\n- Use a friendly, conversational tone';
          break;
        case 'academic':
          systemPrompt += '\n- Use a more formal, scholarly tone with detailed analysis';
          break;
        case 'detailed':
          systemPrompt += '\n- Provide comprehensive, thorough explanations';
          break;
        case 'brief':
          systemPrompt += '\n- Keep responses concise and to the point';
          break;
      }
    }

    // Add book-specific context
    if (bookContext && contextType !== 'general') {
      systemPrompt += `\n\nCurrent reading context:
- Book: "${bookContext.title}" by ${bookContext.author}`;
      
      if (bookContext.currentChapter) {
        systemPrompt += `\n- Current chapter: ${bookContext.currentChapter}`;
      }
      
      if (bookContext.currentPage) {
        systemPrompt += `\n- Current page: ${bookContext.currentPage}`;
      }

      if (bookContext.sessionContext?.notes) {
        systemPrompt += `\n- Reader's current notes: ${bookContext.sessionContext.notes}`;
      }

      if (contextType === 'chapter_specific') {
        systemPrompt += '\n- Focus your responses on the current chapter and its content';
      } else if (contextType === 'book_specific') {
        systemPrompt += '\n- Keep your responses relevant to this specific book';
      }
    }

    if (preferences?.includeExamples) {
      systemPrompt += '\n- Include relevant examples to illustrate your points';
    }

    return systemPrompt;
  }

  /**
   * Generate a conversation title based on the first user message
   */
  private generateConversationTitle(userMessage: string, bookContext?: BookContext): string {
    // Simple title generation logic
    const words = userMessage.split(' ').slice(0, 6).join(' ');
    let title = words.length > 50 ? words.substring(0, 47) + '...' : words;
    
    if (bookContext) {
      title = `${bookContext.title}: ${title}`;
    }
    
    return title || 'New Conversation';
  }

  /**
   * Process a reading assistant request
   */
  public async processMessage(request: ReadingAssistantRequest): Promise<ReadingAssistantResponse> {
    await this.ensureInitialized();

    const systemPrompt = this.generateSystemPrompt(
      request.contextType,
      request.bookContext,
      request.preferences
    );

    // Prepare the AI request
    const messages: AIMessage[] = [
      {
        role: 'system',
        content: systemPrompt,
      },
      ...request.conversationHistory,
      {
        role: 'user',
        content: request.message,
      }
    ];

    const aiRequest: AIRequest = {
      messages,
      temperature: 0.7,
      maxTokens: 1000,
      stream: false,
    };

    try {
      const response = await askAI(aiRequest);
      
      // Generate title for new conversations
      let suggestedTitle: string | undefined;
      if (request.conversationHistory.length === 0) {
        suggestedTitle = this.generateConversationTitle(request.message, request.bookContext);
      }

      return {
        content: response.content,
        provider: response.provider,
        model: response.model,
        usage: response.usage,
        metadata: response.metadata,
        suggestedTitle,
      };
    } catch (error) {
      console.error('Reading assistant AI request failed:', error);
      throw new Error(`AI request failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process a streaming reading assistant request
   */
  public async* processStreamingMessage(
    request: ReadingAssistantRequest
  ): AsyncGenerator<AIStreamChunk, void, unknown> {
    await this.ensureInitialized();

    const systemPrompt = this.generateSystemPrompt(
      request.contextType,
      request.bookContext,
      request.preferences
    );

    // Prepare the AI request
    const messages: AIMessage[] = [
      {
        role: 'system',
        content: systemPrompt,
      },
      ...request.conversationHistory,
      {
        role: 'user',
        content: request.message,
      }
    ];

    const aiRequest: AIRequest = {
      messages,
      temperature: 0.7,
      maxTokens: 1000,
      stream: true,
    };

    try {
      yield* streamAI(aiRequest);
    } catch (error) {
      console.error('Streaming reading assistant AI request failed:', error);
      throw new Error(`Streaming AI request failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get service health status
   */
  public async getHealthStatus() {
    await this.ensureInitialized();
    return this.baseService.getHealthStatus();
  }

  /**
   * Get service statistics
   */
  public getStats() {
    if (!this.initialized) {
      throw new Error('Service not initialized');
    }
    return this.baseService.getStats();
  }
}

/**
 * Global reading assistant instance
 */
let readingAssistantInstance: ReadingAssistantAI | null = null;

/**
 * Get the global reading assistant instance
 */
export function getReadingAssistant(): ReadingAssistantAI {
  if (!readingAssistantInstance) {
    readingAssistantInstance = new ReadingAssistantAI();
  }
  return readingAssistantInstance;
}

/**
 * Initialize the reading assistant service
 */
export async function initializeReadingAssistant(): Promise<ReadingAssistantAI> {
  const assistant = getReadingAssistant();
  await assistant.initialize();
  return assistant;
}

// Types are already exported above with their declarations