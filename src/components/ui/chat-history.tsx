"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle, CardAction } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { Clock, MessageSquare, Trash2, BookOpen, ChevronRight } from "lucide-react"

export interface ChatSession {
  id: string
  title: string
  bookTitle?: string
  chapter?: string
  messageCount: number
  lastMessageAt: Date
  createdAt: Date
  preview?: string
}

export interface ChatHistoryProps {
  sessions: ChatSession[]
  currentSessionId?: string
  onSessionSelect: (sessionId: string) => void
  onSessionDelete?: (sessionId: string) => void
  onNewSession: () => void
  className?: string
}

export function ChatHistory({
  sessions,
  currentSessionId,
  onSessionSelect,
  onSessionDelete,
  onNewSession,
  className,
}: ChatHistoryProps) {
  const sortedSessions = React.useMemo(() => {
    return [...sessions].sort((a, b) => 
      b.lastMessageAt.getTime() - a.lastMessageAt.getTime()
    )
  }, [sessions])

  const formatRelativeTime = (date: Date) => {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMinutes = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMinutes < 1) return "Just now"
    if (diffMinutes < 60) return `${diffMinutes}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    
    return date.toLocaleDateString()
  }

  return (
    <Card className={cn("h-full flex flex-col", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Chat History</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={onNewSession}
            className="text-xs"
          >
            New Chat
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden p-0">
        {sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <MessageSquare className="size-8 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground mb-2">
              No conversations yet
            </p>
            <p className="text-xs text-muted-foreground/70">
              Start a new chat to begin asking questions about your reading
            </p>
          </div>
        ) : (
          <div className="overflow-y-auto h-full">
            {sortedSessions.map((session) => (
              <ChatSessionItem
                key={session.id}
                session={session}
                isActive={session.id === currentSessionId}
                onSelect={() => onSessionSelect(session.id)}
                onDelete={onSessionDelete ? () => onSessionDelete(session.id) : undefined}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface ChatSessionItemProps {
  session: ChatSession
  isActive: boolean
  onSelect: () => void
  onDelete?: () => void
}

function ChatSessionItem({ session, isActive, onSelect, onDelete }: ChatSessionItemProps) {
  const [isHovered, setIsHovered] = React.useState(false)

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDelete?.()
  }

  return (
    <div
      className={cn(
        "group relative border-b border-border/50 p-4 cursor-pointer transition-colors hover:bg-muted/50",
        isActive && "bg-muted border-primary/20"
      )}
      onClick={onSelect}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          {/* Book context */}
          {session.bookTitle && (
            <div className="flex items-center gap-1 mb-1">
              <BookOpen className="size-3 text-muted-foreground/70" />
              <span className="text-xs text-muted-foreground/70 truncate">
                {session.bookTitle}
                {session.chapter && ` • ${session.chapter}`}
              </span>
            </div>
          )}

          {/* Session title */}
          <h4 className={cn(
            "text-sm font-medium truncate mb-1",
            isActive && "text-primary"
          )}>
            {session.title}
          </h4>

          {/* Preview */}
          {session.preview && (
            <p className="text-xs text-muted-foreground/80 line-clamp-2 mb-2">
              {session.preview}
            </p>
          )}

          {/* Metadata */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground/70">
            <div className="flex items-center gap-1">
              <MessageSquare className="size-3" />
              <span>{session.messageCount}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="size-3" />
              <span>{formatRelativeTime(session.lastMessageAt)}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {isActive && (
            <ChevronRight className="size-4 text-primary" />
          )}
          {onDelete && (isHovered || isActive) && (
            <Button
              variant="ghost"
              size="icon"
              className="size-6 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={handleDelete}
            >
              <Trash2 className="size-3" />
              <span className="sr-only">Delete conversation</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

export interface ChatHistoryEmptyProps {
  onNewSession: () => void
  className?: string
}

export function ChatHistoryEmpty({ onNewSession, className }: ChatHistoryEmptyProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center p-8 text-center", className)}>
      <div className="size-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
        <MessageSquare className="size-8 text-muted-foreground/50" />
      </div>
      
      <h3 className="text-lg font-semibold mb-2">Start Your First Chat</h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-sm">
        Ask questions about what you're reading, request summaries, or explore key concepts with AI assistance.
      </p>
      
      <Button onClick={onNewSession}>
        Start New Conversation
      </Button>
    </div>
  )
}

export interface ChatHistoryMobileProps extends Omit<ChatHistoryProps, 'className'> {
  isOpen: boolean
  onClose: () => void
}

export function ChatHistoryMobile({
  isOpen,
  onClose,
  ...props
}: ChatHistoryMobileProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm md:hidden">
      <div className="fixed inset-x-0 top-0 bottom-0 bg-background border-r">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Chat History</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            ×
          </Button>
        </div>
        
        <div className="h-full overflow-hidden">
          <ChatHistory {...props} className="border-0 rounded-none" />
        </div>
      </div>
    </div>
  )
}