"use client";

import { useState, useEffect, useRef } from "react";
import { Send, Bot, User, Sparkles, BookOpen, MessageSquare, Loader2, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { BookListItem } from "@/types/book";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  context?: any;
  isStreaming?: boolean;
}

interface ReadingAssistantProps {
  book: BookListItem;
  currentChapter?: string;
  currentPage?: number;
  className?: string;
}

export function ReadingAssistant({ 
  book, 
  currentChapter, 
  currentPage, 
  className 
}: ReadingAssistantProps) {
  const t = useTranslations('reading_assistant');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load conversation history on mount
  useEffect(() => {
    loadConversationHistory();
  }, [book.book_uuid]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadConversationHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const response = await fetch(`/api/reading-assistant/conversation/${book.book_uuid}`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error("Error loading conversation history:", error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString(),
      context: {
        currentChapter,
        currentPage,
        readingProgress: book.progress_percentage
      }
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch('/api/reading-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          book_uuid: book.book_uuid,
          question: userMessage.content,
          context: userMessage.context
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response.response,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to get AI response. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const clearConversation = async () => {
    try {
      await fetch(`/api/reading-assistant/conversation/${book.book_uuid}`, {
        method: 'DELETE'
      });
      setMessages([]);
      toast.success("Conversation history cleared");
    } catch (error) {
      console.error("Error clearing conversation:", error);
      toast.error("Failed to clear conversation");
    }
  };

  const generateBookOverview = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/books/${book.book_uuid}/overview`);
      if (response.ok) {
        const data = await response.json();
        
        const overviewMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: data.overview,
          timestamp: new Date().toISOString()
        };

        setMessages(prev => [...prev, overviewMessage]);
        toast.success("Book overview generated!");
      }
    } catch (error) {
      console.error("Error generating overview:", error);
      toast.error("Failed to generate book overview");
    } finally {
      setIsLoading(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const suggestedQuestions = [
    "What are the main themes in this book?",
    "Can you explain this character's motivation?",
    "What's the significance of this chapter?",
    "Help me understand this concept better",
    "What should I focus on while reading?"
  ];

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              Reading Assistant
            </CardTitle>
            <CardDescription>
              AI-powered reading companion for "{book.book?.title}"
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={generateBookOverview}
              disabled={isLoading}
              className="gap-2"
            >
              <BookOpen className="h-4 w-4" />
              Overview
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearConversation}
              className="gap-2 text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Reading Context */}
        {(currentChapter || currentPage) && (
          <div className="flex gap-2 text-sm text-muted-foreground">
            {currentChapter && (
              <Badge variant="outline" className="gap-1">
                <MessageSquare className="h-3 w-3" />
                {currentChapter}
              </Badge>
            )}
            {currentPage && (
              <Badge variant="outline" className="gap-1">
                <BookOpen className="h-3 w-3" />
                Page {currentPage}
              </Badge>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Chat Messages */}
        <ScrollArea className="h-96 w-full rounded-md border p-4">
          {isLoadingHistory ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2 text-sm text-muted-foreground">Loading conversation...</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-8 space-y-4">
              <Bot className="h-12 w-12 mx-auto text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Hi! I'm your reading assistant.</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Ask me anything about "{book.book?.title}"
                </p>
              </div>
              
              {/* Suggested Questions */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Try asking:</p>
                <div className="flex flex-wrap gap-1 justify-center">
                  {suggestedQuestions.slice(0, 3).map((question, index) => (
                    <Button
                      key={index}
                      variant="ghost"
                      size="sm"
                      className="text-xs h-7 px-2"
                      onClick={() => setInput(question)}
                    >
                      {question}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {message.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  
                  <div
                    className={`max-w-[80%] rounded-lg px-3 py-2 ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground ml-auto'
                        : 'bg-muted'
                    }`}
                  >
                    <div className="text-sm whitespace-pre-wrap">
                      {message.content}
                    </div>
                    <div className="text-xs opacity-70 mt-1">
                      {formatTimestamp(message.timestamp)}
                    </div>
                  </div>

                  {message.role === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                      <User className="h-4 w-4" />
                    </div>
                  )}
                </div>
              ))}
              
              {isLoading && (
                <div className="flex gap-3 justify-start">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                  <div className="bg-muted rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Thinking...
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        <Separator />

        {/* Input Form */}
        <form onSubmit={sendMessage} className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me anything about this book..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button type="submit" disabled={isLoading || !input.trim()}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setInput("What are the main themes?")}
            disabled={isLoading}
            className="text-xs"
          >
            <Sparkles className="h-3 w-3 mr-1" />
            Main themes
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setInput("Explain this chapter")}
            disabled={isLoading}
            className="text-xs"
          >
            <BookOpen className="h-3 w-3 mr-1" />
            Chapter summary
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}