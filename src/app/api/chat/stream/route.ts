/**
 * Chat Streaming API Route
 * 
 * Handles streaming chat requests for the BooksOfLife reading assistant 
 * with real-time response streaming using Server-Sent Events.
 */

import { NextRequest } from 'next/server';
import { respErr, respJson } from '@/lib/resp';
import { getUserUuid } from '@/services/user';
import { getReadingAssistant, ReadingAssistantRequest, BookContext } from '@/services/aiService';
import { ConversationService, CreateConversationOptions, AddMessageOptions } from '@/services/conversationService';

/**
 * Chat streaming request payload
 */
interface ChatStreamRequest {
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
 * Streaming data chunk types
 */
interface StreamChunk {
  type: 'chunk' | 'metadata' | 'error' | 'done';
  data?: any;
}

export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const userUuid = await getUserUuid();
    if (!userUuid) {
      return respJson(-2, "no auth");
    }

    // Parse request
    const body: ChatStreamRequest = await req.json();
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
      stream: true,
      preferences: body.preferences,
    };

    // Create readable stream for Server-Sent Events
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        
        // Helper function to send data
        const sendData = (chunk: StreamChunk) => {
          const data = `data: ${JSON.stringify(chunk)}\n\n`;
          controller.enqueue(encoder.encode(data));
        };

        try {
          const startTime = Date.now();
          let fullContent = '';
          let chunkCount = 0;
          
          // Send initial metadata
          sendData({
            type: 'metadata',
            data: {
              conversationUuid,
              isNewConversation,
              timestamp: startTime,
            }
          });

          // Process streaming response
          for await (const chunk of readingAssistant.processStreamingMessage(aiRequest)) {
            chunkCount++;
            
            // Send chunk data
            sendData({
              type: 'chunk',
              data: {
                delta: chunk.delta,
                done: chunk.done,
                model: chunk.model,
                provider: chunk.provider,
                chunkIndex: chunkCount,
              }
            });

            // Accumulate full content
            fullContent += chunk.delta;

            // If this is the final chunk, handle completion
            if (chunk.done) {
              const responseTime = Date.now() - startTime;
              
              // Add assistant message to database
              const assistantMessageOptions: AddMessageOptions = {
                conversationUuid,
                userUuid,
                role: 'assistant',
                content: fullContent,
                metadata: {
                  provider: chunk.provider,
                  model: chunk.model,
                  chunkCount,
                  streamingResponse: true,
                },
                tokenCount: chunk.usage?.totalTokens || undefined,
                aiModel: chunk.model,
                aiProvider: chunk.provider,
                responseTimeMs: responseTime,
              };

              const assistantMessage = await ConversationService.addMessage(assistantMessageOptions);

              // Generate and update conversation title for new conversations
              if (isNewConversation) {
                // Simple title generation from first few words
                const words = body.message.split(' ').slice(0, 6).join(' ');
                let title = words.length > 50 ? words.substring(0, 47) + '...' : words;
                if (body.bookContext) {
                  title = `${body.bookContext.title}: ${title}`;
                }
                
                await ConversationService.updateConversationTitle(
                  conversationUuid,
                  userUuid,
                  title || 'New Conversation'
                );
              }

              // Send completion metadata
              sendData({
                type: 'done',
                data: {
                  messageUuid: assistantMessage.uuid,
                  totalChunks: chunkCount,
                  responseTime,
                  usage: chunk.usage,
                  provider: chunk.provider,
                  model: chunk.model,
                  conversationUuid,
                }
              });
              
              break;
            }
          }

        } catch (error) {
          console.error('Streaming chat error:', error);
          
          // Send error information
          sendData({
            type: 'error',
            data: {
              message: error instanceof Error ? error.message : 'Unknown streaming error',
              conversationUuid,
              timestamp: Date.now(),
            }
          });
        } finally {
          controller.close();
        }
      },
    });

    // Return streaming response
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });

  } catch (error) {
    console.error('Chat streaming API error:', error);
    
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
    
    return respErr('Failed to process streaming chat message');
  }
}

/**
 * OPTIONS handler for CORS preflight
 */
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}