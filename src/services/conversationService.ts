/**
 * Conversation Service for BooksOfLife Reading Assistant
 * 
 * This service handles persistence and management of AI conversations,
 * including conversation history, message storage, and context management.
 */

import { db } from "@/db";
import { ai_conversations, ai_messages } from "@/db/schema";
import { eq, desc, asc, and } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { AIMessage, AIProvider } from "@/types/ai";
import { BookContext } from "./aiService";

/**
 * Database conversation record
 */
export interface ConversationRecord {
  id: number;
  uuid: string;
  user_uuid: string;
  book_uuid: string | null;
  session_uuid: string | null;
  title: string;
  context_type: string;
  context_data: any;
  status: string;
  total_messages: number;
  last_message_at: Date | null;
  ai_model: string | null;
  ai_provider: string | null;
  created_at: Date | null;
  updated_at: Date | null;
}

/**
 * Database message record
 */
export interface MessageRecord {
  id: number;
  uuid: string;
  conversation_uuid: string;
  user_uuid: string;
  role: string;
  content: string;
  metadata: any;
  token_count: number | null;
  ai_model: string | null;
  ai_provider: string | null;
  response_time_ms: number | null;
  function_call: any;
  error_info: any;
  sequence_number: number;
  is_edited: boolean;
  edit_history: any;
  created_at: Date | null;
  updated_at: Date | null;
}

/**
 * Conversation with messages
 */
export interface ConversationWithMessages {
  conversation: ConversationRecord;
  messages: MessageRecord[];
}

/**
 * Create conversation options
 */
export interface CreateConversationOptions {
  userUuid: string;
  title?: string;
  bookContext?: BookContext;
  contextType?: 'general' | 'book_specific' | 'chapter_specific';
  contextData?: any;
}

/**
 * Add message options
 */
export interface AddMessageOptions {
  conversationUuid: string;
  userUuid: string;
  role: 'user' | 'assistant' | 'system' | 'function';
  content: string;
  metadata?: any;
  tokenCount?: number;
  aiModel?: string;
  aiProvider?: AIProvider;
  responseTimeMs?: number;
  functionCall?: any;
  errorInfo?: any;
}

/**
 * Conversation Service
 */
export class ConversationService {
  /**
   * Create a new conversation
   */
  public static async createConversation(options: CreateConversationOptions): Promise<ConversationRecord> {
    const conversationUuid = uuidv4();
    const now = new Date();

    const conversation = {
      uuid: conversationUuid,
      user_uuid: options.userUuid,
      book_uuid: options.bookContext?.bookUuid || null,
      session_uuid: options.bookContext?.sessionContext?.sessionUuid || null,
      title: options.title || 'New Conversation',
      context_type: options.contextType || 'general',
      context_data: options.contextData || options.bookContext || null,
      status: 'active',
      total_messages: 0,
      last_message_at: null,
      ai_model: null,
      ai_provider: null,
      created_at: now,
      updated_at: now,
    };

    const [created] = await db()
      .insert(ai_conversations)
      .values(conversation)
      .returning();

    return created;
  }

  /**
   * Get conversation by UUID
   */
  public static async getConversation(conversationUuid: string, userUuid: string): Promise<ConversationRecord | null> {
    const [conversation] = await db()
      .select()
      .from(ai_conversations)
      .where(
        and(
          eq(ai_conversations.uuid, conversationUuid),
          eq(ai_conversations.user_uuid, userUuid),
          eq(ai_conversations.status, 'active')
        )
      )
      .limit(1);

    return conversation || null;
  }

  /**
   * Get conversation with all messages
   */
  public static async getConversationWithMessages(
    conversationUuid: string, 
    userUuid: string
  ): Promise<ConversationWithMessages | null> {
    const conversation = await this.getConversation(conversationUuid, userUuid);
    if (!conversation) {
      return null;
    }

    const messages = await db()
      .select()
      .from(ai_messages)
      .where(
        and(
          eq(ai_messages.conversation_uuid, conversationUuid),
          eq(ai_messages.user_uuid, userUuid)
        )
      )
      .orderBy(asc(ai_messages.sequence_number));

    return {
      conversation,
      messages,
    };
  }

  /**
   * Get user conversations with pagination
   */
  public static async getUserConversations(
    userUuid: string,
    limit: number = 20,
    offset: number = 0,
    bookUuid?: string
  ): Promise<ConversationRecord[]> {
    let whereClause = and(
      eq(ai_conversations.user_uuid, userUuid),
      eq(ai_conversations.status, 'active')
    );

    if (bookUuid) {
      whereClause = and(
        whereClause,
        eq(ai_conversations.book_uuid, bookUuid)
      );
    }

    const conversations = await db()
      .select()
      .from(ai_conversations)
      .where(whereClause)
      .orderBy(desc(ai_conversations.last_message_at), desc(ai_conversations.created_at))
      .limit(limit)
      .offset(offset);

    return conversations;
  }

  /**
   * Add message to conversation
   */
  public static async addMessage(options: AddMessageOptions): Promise<MessageRecord> {
    // Get current message count for sequence number
    const messageCount = await db()
      .select({ count: ai_messages.id })
      .from(ai_messages)
      .where(eq(ai_messages.conversation_uuid, options.conversationUuid));

    const sequenceNumber = messageCount.length;
    const messageUuid = uuidv4();
    const now = new Date();

    const message = {
      uuid: messageUuid,
      conversation_uuid: options.conversationUuid,
      user_uuid: options.userUuid,
      role: options.role,
      content: options.content,
      metadata: options.metadata || null,
      token_count: options.tokenCount || null,
      ai_model: options.aiModel || null,
      ai_provider: options.aiProvider || null,
      response_time_ms: options.responseTimeMs || null,
      function_call: options.functionCall || null,
      error_info: options.errorInfo || null,
      sequence_number: sequenceNumber,
      is_edited: false,
      edit_history: null,
      created_at: now,
      updated_at: now,
    };

    // Insert the message
    const [created] = await db()
      .insert(ai_messages)
      .values(message)
      .returning();

    // Update conversation stats
    await db()
      .update(ai_conversations)
      .set({
        total_messages: sequenceNumber + 1,
        last_message_at: now,
        ai_model: options.aiModel || undefined,
        ai_provider: options.aiProvider || undefined,
        updated_at: now,
      })
      .where(eq(ai_conversations.uuid, options.conversationUuid));

    return created;
  }

  /**
   * Update conversation title
   */
  public static async updateConversationTitle(
    conversationUuid: string,
    userUuid: string,
    title: string
  ): Promise<boolean> {
    const result = await db()
      .update(ai_conversations)
      .set({
        title,
        updated_at: new Date(),
      })
      .where(
        and(
          eq(ai_conversations.uuid, conversationUuid),
          eq(ai_conversations.user_uuid, userUuid)
        )
      );

    return result.rowCount > 0;
  }

  /**
   * Archive conversation (soft delete)
   */
  public static async archiveConversation(
    conversationUuid: string,
    userUuid: string
  ): Promise<boolean> {
    const result = await db()
      .update(ai_conversations)
      .set({
        status: 'archived',
        updated_at: new Date(),
      })
      .where(
        and(
          eq(ai_conversations.uuid, conversationUuid),
          eq(ai_conversations.user_uuid, userUuid)
        )
      );

    return result.rowCount > 0;
  }

  /**
   * Delete conversation (hard delete)
   */
  public static async deleteConversation(
    conversationUuid: string,
    userUuid: string
  ): Promise<boolean> {
    // Delete messages first
    await db()
      .delete(ai_messages)
      .where(
        and(
          eq(ai_messages.conversation_uuid, conversationUuid),
          eq(ai_messages.user_uuid, userUuid)
        )
      );

    // Delete conversation
    const result = await db()
      .delete(ai_conversations)
      .where(
        and(
          eq(ai_conversations.uuid, conversationUuid),
          eq(ai_conversations.user_uuid, userUuid)
        )
      );

    return result.rowCount > 0;
  }

  /**
   * Convert database messages to AI messages format
   */
  public static convertToAIMessages(messages: MessageRecord[]): AIMessage[] {
    return messages.map(msg => ({
      role: msg.role as 'user' | 'assistant' | 'system' | 'function',
      content: msg.content,
      functionCall: msg.function_call || undefined,
      metadata: msg.metadata || undefined,
    }));
  }

  /**
   * Get conversation statistics for a user
   */
  public static async getUserConversationStats(userUuid: string): Promise<{
    totalConversations: number;
    totalMessages: number;
    conversationsByBook: { bookUuid: string; count: number }[];
    recentActivity: Date | null;
  }> {
    // Get total conversations
    const [totalConversations] = await db()
      .select({ count: ai_conversations.id })
      .from(ai_conversations)
      .where(
        and(
          eq(ai_conversations.user_uuid, userUuid),
          eq(ai_conversations.status, 'active')
        )
      );

    // Get total messages
    const [totalMessages] = await db()
      .select({ count: ai_messages.id })
      .from(ai_messages)
      .where(eq(ai_messages.user_uuid, userUuid));

    // Get conversations by book
    const conversationsByBook = await db()
      .select({
        bookUuid: ai_conversations.book_uuid,
        count: ai_conversations.id,
      })
      .from(ai_conversations)
      .where(
        and(
          eq(ai_conversations.user_uuid, userUuid),
          eq(ai_conversations.status, 'active')
        )
      )
      .groupBy(ai_conversations.book_uuid);

    // Get recent activity
    const [recentActivity] = await db()
      .select({ lastActivity: ai_conversations.last_message_at })
      .from(ai_conversations)
      .where(eq(ai_conversations.user_uuid, userUuid))
      .orderBy(desc(ai_conversations.last_message_at))
      .limit(1);

    return {
      totalConversations: totalConversations?.count || 0,
      totalMessages: totalMessages?.count || 0,
      conversationsByBook: conversationsByBook
        .filter(item => item.bookUuid)
        .map(item => ({
          bookUuid: item.bookUuid!,
          count: Number(item.count),
        })),
      recentActivity: recentActivity?.lastActivity || null,
    };
  }
}

// Export types
// Types are already exported above with their declarations