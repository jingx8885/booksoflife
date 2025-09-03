/**
 * Mock AI Provider for Development and Testing
 * 
 * This provider returns realistic mock responses for development
 * when real AI providers are not configured.
 */

import {
  AIProvider,
  AIRequest,
  AIResponse,
  AIStreamChunk,
  AIModel,
  ProviderConfig,
  AIError,
} from '@/types/ai';
import { BaseAIAdapter } from '@/services/ai/base';

export class MockAIAdapter extends BaseAIAdapter {
  public readonly provider: AIProvider = 'mock';
  private responses = new Map<string, string>();

  constructor() {
    super();
    this.setupMockResponses();
  }

  private setupMockResponses() {
    // Book overview responses
    this.responses.set('overview', `
# Book Overview

This is a comprehensive reading guide that will help you navigate through this book effectively.

## What to Expect

This book offers valuable insights and engaging content that will enhance your understanding of the subject matter. The author presents complex ideas in an accessible way, making it suitable for readers at various levels.

## Key Themes

- **Main Theme**: The central concepts revolve around personal growth and understanding
- **Character Development**: If fiction, watch for how characters evolve throughout the story
- **Practical Applications**: Look for ways to apply the concepts to your own life

## Reading Approach

I recommend taking your time with each chapter, as the author builds concepts progressively. Consider keeping notes as you read, as this will help reinforce key ideas.

## Estimated Reading Time

Based on the book's length and complexity, plan for thoughtful, engaged reading rather than speed. Quality comprehension is more valuable than quick completion.

**Happy reading! Feel free to ask me questions as you progress through the book.**
    `);

    // Theme analysis
    this.responses.set('themes', `
The main themes in this book include:

**1. Personal Growth and Transformation**
The author explores how individuals can evolve and develop throughout their journey, highlighting key moments of change and self-discovery.

**2. Human Relationships and Connection**
A significant focus is placed on how we relate to others and build meaningful connections, examining both the challenges and rewards of human interaction.

**3. Knowledge and Understanding**
The pursuit of knowledge and deeper understanding serves as a driving force, encouraging readers to question assumptions and seek truth.

**4. Overcoming Challenges**
The book addresses various obstacles and how they can be transformed into opportunities for growth and learning.

These themes are interwoven throughout the narrative, creating a rich tapestry of ideas that resonate on multiple levels.
    `);

    // Chapter explanation
    this.responses.set('chapter', `
This chapter serves as an important turning point in the book. Here's what you should focus on:

**Key Events:**
- The main developments that drive the story forward
- Important character interactions and their significance
- New information that changes our understanding

**Important Concepts:**
- The author introduces several key ideas that will be important later
- Watch for recurring motifs and symbols
- Note how this chapter connects to earlier themes

**Questions to Consider:**
- How do the events in this chapter relate to the overall message?
- What questions does this chapter raise for you?
- How do the characters' actions reflect the book's central themes?

This chapter is particularly significant because it [deepens understanding / advances the plot / reveals important information]. Take time to reflect on these elements as you continue reading.
    `);

    // Character analysis
    this.responses.set('character', `
This character is fascinating and complex, serving multiple important functions in the story:

**Character Traits:**
- Shows both strengths and vulnerabilities that make them relatable
- Demonstrates growth and change throughout the narrative
- Represents certain themes or ideas that the author wants to explore

**Motivation and Goals:**
The character's actions are driven by [personal desires / external circumstances / internal conflicts] that create compelling tension and drive the story forward.

**Relationship to Themes:**
This character embodies the book's exploration of [relevant theme], showing how these concepts play out in real situations.

**Development Arc:**
Watch how this character evolves - their journey often mirrors the reader's own understanding of the book's central messages.

The character's complexity adds depth to the story and provides multiple entry points for reader engagement and reflection.
    `);
  }

  private getMockResponse(request: AIRequest): string {
    const userMessage = request.messages[request.messages.length - 1]?.content.toLowerCase() || '';
    
    // Pattern matching for different types of questions
    if (userMessage.includes('overview') || userMessage.includes('about this book')) {
      return this.responses.get('overview')!;
    }
    
    if (userMessage.includes('theme') || userMessage.includes('meaning')) {
      return this.responses.get('themes')!;
    }
    
    if (userMessage.includes('chapter') || userMessage.includes('summary')) {
      return this.responses.get('chapter')!;
    }
    
    if (userMessage.includes('character') || userMessage.includes('motivation')) {
      return this.responses.get('character')!;
    }

    // Default helpful response
    return `
That's a great question about this book! Let me help you explore this topic.

Based on what you're asking, I can see you're thinking deeply about the content. Here are some key points to consider:

**Main Points:**
- The author presents this concept as part of a larger framework
- This connects to several other ideas discussed in the book
- Consider how this relates to your own experience and understanding

**Further Reflection:**
- What aspects of this topic resonate most with you?
- How does this connect to other parts of the book you've read?
- What questions does this raise for your own thinking?

**Suggestions:**
- Try re-reading the relevant section with these ideas in mind
- Consider how this concept might apply to real-world situations
- Think about how this builds on previous chapters

I'm here to help you explore any aspect of this book in more depth. Feel free to ask more specific questions about particular passages, characters, or concepts!
    `;
  }

  async request(request: AIRequest): Promise<AIResponse> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
    
    const response = this.getMockResponse(request);
    
    return {
      id: `mock-${Date.now()}`,
      content: response.trim(),
      role: 'assistant',
      provider: 'mock',
      model: 'mock-model',
      usage: {
        prompt_tokens: 100,
        completion_tokens: 200,
        total_tokens: 300
      },
      created_at: new Date().toISOString()
    };
  }

  async *streamRequest(request: AIRequest): AsyncGenerator<AIStreamChunk, void, unknown> {
    const response = this.getMockResponse(request);
    const words = response.trim().split(' ');
    
    // Simulate streaming by yielding words with realistic delays
    for (let i = 0; i < words.length; i++) {
      const content = i === 0 ? words[i] : ' ' + words[i];
      
      yield {
        id: `mock-${Date.now()}-${i}`,
        content,
        role: 'assistant',
        provider: 'mock',
        model: 'mock-model',
        created_at: new Date().toISOString(),
        delta: { content }
      };
      
      // Vary the delay to simulate realistic typing
      const delay = Math.random() * 100 + 50;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  async healthCheck(): Promise<boolean> {
    // Mock provider is always healthy
    return true;
  }

  async getRateLimitStatus(): Promise<{
    remaining: number;
    resetTime: number;
    limit: number;
  }> {
    // Mock provider has generous limits
    return {
      remaining: 1000,
      resetTime: Date.now() + 3600000, // Reset in 1 hour
      limit: 1000,
    };
  }

  async getModels(): Promise<AIModel[]> {
    return [
      {
        id: 'mock-model',
        name: 'Mock Model',
        provider: 'mock',
        capabilities: {
          maxContextTokens: 4096,
          maxOutputTokens: 2048,
          supportsStreaming: true,
          supportsFunctionCalling: false,
          supportsImages: false,
          supportsDocuments: false,
          costPerInputToken: 0,
          costPerOutputToken: 0,
        },
        available: true,
      },
      {
        id: 'mock-advanced',
        name: 'Mock Advanced Model',
        provider: 'mock',
        capabilities: {
          maxContextTokens: 8192,
          maxOutputTokens: 4096,
          supportsStreaming: true,
          supportsFunctionCalling: false,
          supportsImages: false,
          supportsDocuments: false,
          costPerInputToken: 0,
          costPerOutputToken: 0,
        },
        available: true,
      },
      {
        id: 'mock-fast',
        name: 'Mock Fast Model',
        provider: 'mock',
        capabilities: {
          maxContextTokens: 2048,
          maxOutputTokens: 1024,
          supportsStreaming: true,
          supportsFunctionCalling: false,
          supportsImages: false,
          supportsDocuments: false,
          costPerInputToken: 0,
          costPerOutputToken: 0,
        },
        available: true,
      },
    ];
  }
}