import { getAIService, askAI, streamAI } from "@/services/ai";
import { database as db } from "@/db";
import { books, book_list_items, ai_conversations, ai_messages } from "@/db/schema";
import { Book, BookListItem } from "@/types/book";
import { AIRequest, AIStreamChunk } from "@/types/ai";
import { eq, and, desc } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

export interface ReadingAssistantContext {
  book: Book;
  currentChapter?: string;
  currentPage?: number;
  readingProgress?: number;
  userQuestion?: string;
  conversationHistory?: ConversationMessage[];
}

export interface SimpleContext {
  currentChapter?: string;
  currentPage?: number;
  readingProgress?: number;
}

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  context?: any;
}

export interface ReadingAssistantResponse {
  response: string;
  context_used: boolean;
  suggestions?: string[];
  related_concepts?: string[];
}

export class ReadingAssistantService {
  // Generate book overview and reading guide
  static async generateBookOverview(book: Book): Promise<string> {
    const prompt = this.buildBookOverviewPrompt(book);
    
    const request: AIRequest = {
      messages: [
        {
          role: 'system',
          content: 'You are an AI reading assistant that helps users understand books better. Provide comprehensive but concise book overviews.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      model: 'gemini-flash',
      temperature: 0.7,
      max_tokens: 1500
    };

    try {
      const response = await askAI(request, { preferredProvider: 'gemini' });
      return response.content;
    } catch (error) {
      console.error('Error generating book overview:', error);
      throw new Error('Failed to generate book overview');
    }
  }

  // Answer questions about the book with context
  static async answerBookQuestion(
    userUuid: string,
    bookUuid: string,
    question: string,
    context?: SimpleContext
  ): Promise<ReadingAssistantResponse> {
    // Get or create conversation
    const conversationId = await this.getOrCreateConversation(userUuid, bookUuid);
    
    // Get conversation history
    const history = await this.getConversationHistory(conversationId, 10);
    
    // Build the prompt with book context
    const prompt = await this.buildContextualPrompt(bookUuid, question, context, history);
    
    const request: AIRequest = {
      messages: [
        {
          role: 'system',
          content: this.getSystemPrompt()
        },
        ...history.map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        })),
        {
          role: 'user',
          content: prompt
        }
      ],
      model: 'gemini-flash',
      temperature: 0.8,
      max_tokens: 1000
    };

    try {
      const response = await askAI(request, { 
        preferredProvider: 'gemini',
        requireLowLatency: true 
      });

      // Save the conversation
      await this.saveConversationMessage(conversationId, 'user', question, context);
      await this.saveConversationMessage(conversationId, 'assistant', response.content);

      return {
        response: response.content,
        context_used: !!context,
        suggestions: this.extractSuggestions(response.content),
        related_concepts: this.extractConcepts(response.content)
      };
    } catch (error) {
      console.error('Error answering book question:', error);
      throw new Error('Failed to get AI response');
    }
  }

  // Stream response for real-time interaction
  static async* streamBookQuestion(
    userUuid: string,
    bookUuid: string,
    question: string,
    context?: SimpleContext
  ): AsyncGenerator<AIStreamChunk, void, unknown> {
    const conversationId = await this.getOrCreateConversation(userUuid, bookUuid);
    const history = await this.getConversationHistory(conversationId, 10);
    const prompt = await this.buildContextualPrompt(bookUuid, question, context, history);
    
    const request: AIRequest = {
      messages: [
        {
          role: 'system',
          content: this.getSystemPrompt()
        },
        ...history.map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        })),
        {
          role: 'user',
          content: prompt
        }
      ],
      model: 'gemini-flash',
      temperature: 0.8,
      max_tokens: 1000,
      stream: true
    };

    let fullResponse = '';
    
    try {
      for await (const chunk of streamAI(request, { preferredProvider: 'gemini' })) {
        if (chunk.content) {
          fullResponse += chunk.content;
        }
        yield chunk;
      }

      // Save the conversation after streaming completes
      await this.saveConversationMessage(conversationId, 'user', question, context);
      await this.saveConversationMessage(conversationId, 'assistant', fullResponse);
    } catch (error) {
      console.error('Error streaming book question:', error);
      throw new Error('Failed to stream AI response');
    }
  }

  // Generate chapter summary
  static async generateChapterSummary(
    book: Book,
    chapterTitle: string,
    chapterContent?: string
  ): Promise<string> {
    const prompt = `Please provide a concise summary of this chapter from "${book.title}" by ${book.author}:

Chapter: ${chapterTitle}
${chapterContent ? `Content preview: ${chapterContent.substring(0, 1000)}...` : ''}

Please include:
- Key events and developments
- Important character interactions
- Themes and concepts introduced
- Connection to the overall story

Keep the summary under 300 words.`;

    const request: AIRequest = {
      messages: [
        {
          role: 'system',
          content: 'You are a helpful reading assistant that creates clear, insightful chapter summaries.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      model: 'gemini-flash',
      temperature: 0.7,
      max_tokens: 500
    };

    try {
      const response = await askAI(request);
      return response.content;
    } catch (error) {
      console.error('Error generating chapter summary:', error);
      throw new Error('Failed to generate chapter summary');
    }
  }

  // Get conversation history
  static async getConversationHistory(
    conversationId: string,
    limit: number = 20
  ): Promise<ConversationMessage[]> {
    const messages = await db
      .select({
        uuid: ai_messages.uuid,
        role: ai_messages.role,
        content: ai_messages.content,
        created_at: ai_messages.created_at,
        context: ai_messages.context
      })
      .from(ai_messages)
      .where(eq(ai_messages.conversation_uuid, conversationId))
      .orderBy(desc(ai_messages.created_at))
      .limit(limit);

    return messages.reverse().map(msg => ({
      id: msg.uuid,
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
      timestamp: msg.created_at?.toISOString() || new Date().toISOString(),
      context: msg.context ? JSON.parse(msg.context) : undefined
    }));
  }

  // Clear conversation history
  static async clearConversationHistory(conversationId: string): Promise<void> {
    await db
      .delete(ai_messages)
      .where(eq(ai_messages.conversation_uuid, conversationId));
  }

  // Private helper methods
  private static async getOrCreateConversation(
    userUuid: string,
    bookUuid: string
  ): Promise<string> {
    // Check for existing conversation
    const [existingConv] = await db
      .select()
      .from(ai_conversations)
      .where(
        and(
          eq(ai_conversations.user_uuid, userUuid),
          eq(ai_conversations.book_uuid, bookUuid)
        )
      )
      .limit(1);

    if (existingConv) {
      return existingConv.uuid;
    }

    // Create new conversation
    const conversationUuid = uuidv4();
    const [newConv] = await db
      .insert(ai_conversations)
      .values({
        uuid: conversationUuid,
        user_uuid: userUuid,
        book_uuid: bookUuid,
        title: 'Reading Assistant Chat',
        status: 'active',
        created_at: new Date(),
        updated_at: new Date()
      })
      .returning();

    return newConv.uuid;
  }

  private static async saveConversationMessage(
    conversationId: string,
    role: 'user' | 'assistant',
    content: string,
    context?: any
  ): Promise<void> {
    await db.insert(ai_messages).values({
      uuid: uuidv4(),
      conversation_uuid: conversationId,
      role,
      content,
      context: context ? JSON.stringify(context) : undefined,
      created_at: new Date(),
      updated_at: new Date()
    });
  }

  private static buildBookOverviewPrompt(book: Book): string {
    return `Please provide a comprehensive overview of the book "${book.title}" by ${book.author}.

Book Details:
- Title: ${book.title}
${book.subtitle ? `- Subtitle: ${book.subtitle}` : ''}
- Author: ${book.author}
${book.genre ? `- Genre: ${book.genre}` : ''}
${book.description ? `- Description: ${book.description}` : ''}
${book.page_count ? `- Pages: ${book.page_count}` : ''}

Please include:
1. A brief synopsis (without major spoilers)
2. Key themes and concepts
3. Reading difficulty level
4. What readers should expect
5. Important background context needed
6. Estimated reading time and suggested approach

Format the response as a helpful reading guide for someone about to start this book.`;
  }

  private static async buildContextualPrompt(
    bookUuid: string,
    question: string,
    context?: ReadingAssistantContext,
    history?: ConversationMessage[]
  ): string {
    // Get book details
    const [bookItem] = await db
      .select({
        book: {
          uuid: books.uuid,
          title: books.title,
          author: books.author,
          description: books.description,
          genre: books.genre,
          page_count: books.page_count
        }
      })
      .from(books)
      .where(eq(books.uuid, bookUuid))
      .limit(1);

    if (!bookItem) {
      throw new Error('Book not found');
    }

    let prompt = `I'm reading "${bookItem.book.title}" by ${bookItem.book.author}.`;

    if (context) {
      if (context.currentChapter) {
        prompt += ` I'm currently in the chapter: "${context.currentChapter}".`;
      }
      if (context.currentPage && bookItem.book.page_count) {
        prompt += ` I'm on page ${context.currentPage} of ${bookItem.book.page_count}.`;
      }
      if (context.readingProgress) {
        prompt += ` I'm ${Math.round(context.readingProgress)}% through the book.`;
      }
    }

    prompt += `\n\nMy question: ${question}`;

    return prompt;
  }

  private static getSystemPrompt(): string {
    return `You are an AI reading assistant specialized in helping readers understand and engage with books more deeply. Your role is to:

1. Answer questions about books, characters, themes, and plot points
2. Provide context and explanations for difficult passages
3. Help readers connect concepts and ideas
4. Offer insights without major spoilers (unless specifically requested)
5. Adapt your explanation style to the reader's level of understanding
6. Encourage deeper thinking and analysis

Guidelines:
- Be helpful, knowledgeable, and encouraging
- Provide specific examples when possible
- Ask clarifying questions if needed
- Suggest related concepts or themes
- Keep responses focused and concise
- Avoid major spoilers unless the reader explicitly asks for them
- If you're unsure about specific details, acknowledge this rather than guessing

Respond in a conversational, supportive tone that makes reading more enjoyable and educational.`;
  }

  private static extractSuggestions(content: string): string[] {
    // Simple pattern matching to extract suggestions
    const suggestions: string[] = [];
    const lines = content.split('\n');
    
    for (const line of lines) {
      if (line.includes('you might') || line.includes('consider') || line.includes('try')) {
        suggestions.push(line.trim());
      }
    }
    
    return suggestions.slice(0, 3); // Limit to 3 suggestions
  }

  private static extractConcepts(content: string): string[] {
    // Simple pattern matching to extract concepts
    const concepts: string[] = [];
    const conceptPatterns = /\b(theme|concept|idea|motif|symbol)\s+of\s+([^.!?]+)/gi;
    let match;
    
    while ((match = conceptPatterns.exec(content)) !== null) {
      concepts.push(match[2].trim());
    }
    
    return concepts.slice(0, 3); // Limit to 3 concepts
  }
}