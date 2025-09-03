/**
 * Chat API Route - Non-streaming responses
 * 
 * Handles chat requests for the BooksOfLife reading assistant with 
 * conversation persistence and book context support.
 */

import { NextRequest } from 'next/server';
import { respData, respErr, respJson } from '@/lib/resp';
import { getUserUuid } from '@/services/user';
import { getReadingAssistant, ReadingAssistantRequest, BookContext } from '@/services/aiService';
import { ConversationService, CreateConversationOptions, AddMessageOptions } from '@/services/conversationService';

/**
 * Chat request payload
 */
interface ChatRequest {
  /** User message */
  message: string;
  /** Conversation UUID (optional for new conversations) */
  conversationUuid?: string;
  /** Book context */
  bookContext?: BookContext;
  /** Context type */
  contextType?: 'general' | 'book_specific' | 'chapter_specific';
  /** User preferences */
  preferences?: {
    responseStyle?: 'casual' | 'academic' | 'detailed' | 'brief';
    language?: string;
    includeExamples?: boolean;
  };
}

/**
 * Chat response payload
 */
interface ChatResponse {
  /** AI response content */
  content: string;
  /** Conversation UUID */
  conversationUuid: string;
  /** Message UUID */
  messageUuid: string;
  /** AI provider used */
  provider: string;
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
  };
  /** Whether this is a new conversation */
  isNewConversation: boolean;
  /** Suggested title (for new conversations) */
  suggestedTitle?: string;
}

export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const userUuid = await getUserUuid();
    if (!userUuid) {
      return respJson(-2, "no auth");
    }

    // Parse request
    const body: ChatRequest = await req.json();
    if (!body.message) {
      return respErr("message is required");
    }

    // Validate and get conversation
    let conversationUuid = body.conversationUuid;
    let isNewConversation = false;
    let conversation = null;
    let conversationHistory: any[] = [];

    if (conversationUuid) {
      // Get existing conversation
      const conversationData = await ConversationService.getConversationWithMessages(
        conversationUuid,
        userUuid
      );
      
      if (!conversationData) {
        return respErr("conversation not found");
      }
      
      conversation = conversationData.conversation;
      conversationHistory = ConversationService.convertToAIMessages(conversationData.messages);
    } else {
      // Create new conversation
      const createOptions: CreateConversationOptions = {
        userUuid,
        title: 'New Conversation', // Will be updated with suggested title
        bookContext: body.bookContext,
        contextType: body.contextType || 'general',
        contextData: body.bookContext,
      };
      
      conversation = await ConversationService.createConversation(createOptions);
      conversationUuid = conversation.uuid;
      isNewConversation = true;
    }

    // Add user message to database
    const userMessageOptions: AddMessageOptions = {
      conversationUuid,
      userUuid,
      role: 'user',
      content: body.message,
      metadata: {
        bookContext: body.bookContext,
        preferences: body.preferences,
      },
    };

    await ConversationService.addMessage(userMessageOptions);

    // Prepare AI request
    const readingAssistant = getReadingAssistant();
    const aiRequest: ReadingAssistantRequest = {
      message: body.message,
      conversationHistory,
      bookContext: body.bookContext,
      contextType: body.contextType || 'general',
      stream: false,
      preferences: body.preferences,
    };

    // Get AI response
    const startTime = Date.now();
    const aiResponse = await readingAssistant.processMessage(aiRequest);
    const responseTime = Date.now() - startTime;

    // Add assistant message to database
    const assistantMessageOptions: AddMessageOptions = {
      conversationUuid,
      userUuid,
      role: 'assistant',
      content: aiResponse.content,
      metadata: {
        provider: aiResponse.provider,
        model: aiResponse.model,
        finishReason: aiResponse.metadata.finishReason,
      },
      tokenCount: aiResponse.usage.totalTokens,
      aiModel: aiResponse.model,
      aiProvider: aiResponse.provider,
      responseTimeMs: responseTime,
    };

    const assistantMessage = await ConversationService.addMessage(assistantMessageOptions);

    // Update conversation title for new conversations
    if (isNewConversation && aiResponse.suggestedTitle) {
      await ConversationService.updateConversationTitle(
        conversationUuid,
        userUuid,
        aiResponse.suggestedTitle
      );
    }

    // Prepare response
    const response: ChatResponse = {
      content: aiResponse.content,
      conversationUuid,
      messageUuid: assistantMessage.uuid,
      provider: aiResponse.provider,
      model: aiResponse.model,
      usage: aiResponse.usage,
      metadata: {
        duration: responseTime,
        timestamp: Date.now(),
      },
      isNewConversation,
      suggestedTitle: aiResponse.suggestedTitle,
    };

    return respData(response);

  } catch (error) {
    console.error('Chat API error:', error);
    
    // Handle specific AI errors
    if (error instanceof Error) {
      if (error.message.includes('Rate limit')) {
        return respErr('Rate limit exceeded. Please try again later.');
      }
      if (error.message.includes('Authentication')) {
        return respErr('AI service authentication failed.');
      }
      if (error.message.includes('Quota')) {
        return respErr('AI service quota exceeded.');
      }
    }
    
    return respErr('Failed to process chat message');
  }
}

/**
 * GET endpoint to retrieve conversation history
 */
export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const userUuid = await getUserUuid();
    if (!userUuid) {
      return respJson(-2, "no auth");
    }

    const { searchParams } = new URL(req.url);
    const conversationUuid = searchParams.get('conversationUuid');
    const bookUuid = searchParams.get('bookUuid');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (conversationUuid) {
      // Get specific conversation with messages
      const conversationData = await ConversationService.getConversationWithMessages(
        conversationUuid,
        userUuid
      );
      
      if (!conversationData) {
        return respErr("conversation not found");
      }
      
      return respData(conversationData);
    } else {
      // Get user conversations list
      const conversations = await ConversationService.getUserConversations(
        userUuid,
        limit,
        offset,
        bookUuid || undefined
      );
      
      return respData(conversations);
    }

  } catch (error) {
    console.error('Chat GET API error:', error);
    return respErr('Failed to retrieve conversations');
  }
}

/**
 * DELETE endpoint to archive/delete conversations
 */
export async function DELETE(req: NextRequest) {
  try {
    // Check authentication
    const userUuid = await getUserUuid();
    if (!userUuid) {
      return respJson(-2, "no auth");
    }

    const { searchParams } = new URL(req.url);
    const conversationUuid = searchParams.get('conversationUuid');
    const hardDelete = searchParams.get('hardDelete') === 'true';

    if (!conversationUuid) {
      return respErr("conversationUuid is required");
    }

    let success: boolean;
    if (hardDelete) {
      success = await ConversationService.deleteConversation(conversationUuid, userUuid);
    } else {
      success = await ConversationService.archiveConversation(conversationUuid, userUuid);
    }

    if (!success) {
      return respErr("conversation not found or already deleted");
    }

    return respData({ success: true });

  } catch (error) {
    console.error('Chat DELETE API error:', error);
    return respErr('Failed to delete conversation');
  }
}