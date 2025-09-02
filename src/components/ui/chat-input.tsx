"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { Send, Loader2 } from "lucide-react"

export interface ChatInputProps {
  onSendMessage: (message: string) => void
  disabled?: boolean
  placeholder?: string
  className?: string
  isLoading?: boolean
}

export function ChatInput({
  onSendMessage,
  disabled = false,
  placeholder = "Ask about this chapter...",
  className,
  isLoading = false,
}: ChatInputProps) {
  const [message, setMessage] = React.useState("")
  const inputRef = React.useRef<HTMLInputElement>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (message.trim() && !disabled && !isLoading) {
      onSendMessage(message.trim())
      setMessage("")
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  // Focus input when component mounts
  React.useEffect(() => {
    if (inputRef.current && !disabled) {
      inputRef.current.focus()
    }
  }, [disabled])

  return (
    <div className={cn("border-t bg-background", className)}>
      <form onSubmit={handleSubmit} className="flex gap-2 p-4">
        <div className="flex-1 relative">
          <Input
            ref={inputRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled || isLoading}
            className="pr-12"
            autoComplete="off"
            maxLength={1000}
          />
          {/* Character count indicator */}
          {message.length > 800 && (
            <div
              className={cn(
                "absolute right-14 top-1/2 -translate-y-1/2 text-xs px-1 rounded",
                message.length > 950
                  ? "text-destructive"
                  : "text-muted-foreground"
              )}
            >
              {message.length}/1000
            </div>
          )}
        </div>
        
        <Button
          type="submit"
          size="icon"
          disabled={!message.trim() || disabled || isLoading}
          className="shrink-0"
        >
          {isLoading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Send className="size-4" />
          )}
          <span className="sr-only">Send message</span>
        </Button>
      </form>
    </div>
  )
}

export interface QuickActionsProps {
  onQuickAction: (action: string) => void
  disabled?: boolean
  className?: string
}

const QUICK_ACTIONS = [
  { id: "summarize", label: "Summarize", icon: "📝" },
  { id: "explain", label: "Explain key concepts", icon: "💡" },
  { id: "questions", label: "Generate questions", icon: "❓" },
  { id: "relate", label: "Connect to other parts", icon: "🔗" },
]

export function QuickActions({
  onQuickAction,
  disabled = false,
  className,
}: QuickActionsProps) {
  return (
    <div className={cn("border-t bg-muted/30 p-3", className)}>
      <div className="flex flex-wrap gap-2">
        <span className="text-xs text-muted-foreground font-medium">
          Quick actions:
        </span>
        {QUICK_ACTIONS.map((action) => (
          <Button
            key={action.id}
            variant="outline"
            size="sm"
            onClick={() => onQuickAction(action.label)}
            disabled={disabled}
            className="text-xs h-7 px-2"
          >
            <span className="mr-1">{action.icon}</span>
            {action.label}
          </Button>
        ))}
      </div>
    </div>
  )
}

export interface ChatInputWrapperProps {
  onSendMessage: (message: string) => void
  disabled?: boolean
  isLoading?: boolean
  showQuickActions?: boolean
  className?: string
}

export function ChatInputWrapper({
  onSendMessage,
  disabled = false,
  isLoading = false,
  showQuickActions = true,
  className,
}: ChatInputWrapperProps) {
  return (
    <div className={cn("flex flex-col", className)}>
      {showQuickActions && (
        <QuickActions
          onQuickAction={onSendMessage}
          disabled={disabled || isLoading}
        />
      )}
      <ChatInput
        onSendMessage={onSendMessage}
        disabled={disabled}
        isLoading={isLoading}
      />
    </div>
  )
}