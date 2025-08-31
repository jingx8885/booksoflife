"use client"

import * as React from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { Bot, User } from "lucide-react"

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  isStreaming?: boolean
}

interface ChatMessageProps {
  message: ChatMessage
  className?: string
}

export function ChatMessage({ message, className }: ChatMessageProps) {
  const isUser = message.role === 'user'
  const isAssistant = message.role === 'assistant'

  return (
    <div
      className={cn(
        "flex w-full gap-3 px-4 py-3",
        isUser && "flex-row-reverse",
        className
      )}
    >
      {/* Avatar */}
      <Avatar className={cn("size-8 shrink-0", isUser && "bg-primary")}>
        {isUser ? (
          <>
            <AvatarFallback className="bg-primary text-primary-foreground">
              <User className="size-4" />
            </AvatarFallback>
          </>
        ) : (
          <>
            <AvatarFallback className="bg-muted">
              <Bot className="size-4" />
            </AvatarFallback>
          </>
        )}
      </Avatar>

      {/* Message Content */}
      <div className={cn("flex flex-col gap-1 flex-1 max-w-[80%]")}>
        {/* Message Bubble */}
        <div
          className={cn(
            "rounded-lg px-3 py-2 text-sm break-words",
            isUser
              ? "bg-primary text-primary-foreground ml-auto"
              : "bg-muted text-muted-foreground mr-auto",
            message.isStreaming && "animate-pulse"
          )}
        >
          {message.content}
          {message.isStreaming && (
            <span className="inline-block w-2 h-4 bg-current opacity-75 animate-pulse ml-1">
              |
            </span>
          )}
        </div>

        {/* Timestamp */}
        <div
          className={cn(
            "text-xs text-muted-foreground/70 px-1",
            isUser ? "text-right" : "text-left"
          )}
        >
          {message.timestamp.toLocaleTimeString(undefined, {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      </div>
    </div>
  )
}

export interface TypingIndicatorProps {
  className?: string
}

export function TypingIndicator({ className }: TypingIndicatorProps) {
  return (
    <div className={cn("flex w-full gap-3 px-4 py-3", className)}>
      {/* Avatar */}
      <Avatar className="size-8 shrink-0">
        <AvatarFallback className="bg-muted">
          <Bot className="size-4" />
        </AvatarFallback>
      </Avatar>

      {/* Typing Animation */}
      <div className="flex flex-col gap-1 flex-1">
        <div className="bg-muted rounded-lg px-3 py-2 mr-auto max-w-[100px]">
          <div className="flex gap-1 items-center">
            <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
            <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
            <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce"></div>
          </div>
        </div>
      </div>
    </div>
  )
}