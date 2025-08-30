"use client";

import { useState } from "react";
import { BookOpen, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface BookCoverProps {
  src?: string;
  alt: string;
  title?: string;
  author?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  showPlaceholder?: boolean;
  onClick?: () => void;
}

const sizeClasses = {
  xs: "w-8 h-12",
  sm: "w-16 h-20",
  md: "w-20 h-28",
  lg: "w-24 h-32",
  xl: "w-32 h-40"
};

const iconSizeClasses = {
  xs: "h-3 w-3",
  sm: "h-4 w-4", 
  md: "h-6 w-6",
  lg: "h-8 w-8",
  xl: "h-10 w-10"
};

const textSizeClasses = {
  xs: "text-xs",
  sm: "text-xs",
  md: "text-sm", 
  lg: "text-sm",
  xl: "text-base"
};

export function BookCover({
  src,
  alt,
  title,
  author,
  size = "md",
  className,
  showPlaceholder = true,
  onClick
}: BookCoverProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(!!src);

  const showImage = src && !imageError;
  const showContent = showPlaceholder && (!src || imageError);

  return (
    <div
      className={cn(
        "relative rounded-md overflow-hidden shadow-sm border bg-background",
        sizeClasses[size],
        onClick && "cursor-pointer hover:shadow-md transition-shadow",
        className
      )}
      onClick={onClick}
    >
      {/* Loading state */}
      {imageLoading && (
        <div className="absolute inset-0 bg-muted animate-pulse flex items-center justify-center">
          <ImageIcon className={cn("text-muted-foreground", iconSizeClasses[size])} />
        </div>
      )}

      {/* Image */}
      {showImage && (
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-cover"
          onLoad={() => setImageLoading(false)}
          onError={() => {
            setImageError(true);
            setImageLoading(false);
          }}
        />
      )}

      {/* Placeholder content */}
      {showContent && !imageLoading && (
        <div className="w-full h-full flex flex-col items-center justify-center p-2 bg-gradient-to-br from-muted/50 to-muted">
          <BookOpen className={cn("text-muted-foreground mb-1", iconSizeClasses[size])} />
          
          {title && (
            <div className={cn("text-center text-muted-foreground", textSizeClasses[size])}>
              <p className="font-medium line-clamp-2 leading-tight mb-0.5">
                {title}
              </p>
              {author && size !== "xs" && (
                <p className="text-xs opacity-70 line-clamp-1">
                  {author}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Hover overlay */}
      {onClick && (
        <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors" />
      )}
    </div>
  );
}

interface BookCoverGridProps {
  books: Array<{
    id: string;
    title: string;
    author?: string;
    cover_url?: string;
  }>;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  onBookClick?: (bookId: string) => void;
  maxItems?: number;
}

export function BookCoverGrid({
  books,
  size = "md",
  className,
  onBookClick,
  maxItems
}: BookCoverGridProps) {
  const displayBooks = maxItems ? books.slice(0, maxItems) : books;
  const remainingCount = maxItems && books.length > maxItems ? books.length - maxItems : 0;

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {displayBooks.map((book) => (
        <BookCover
          key={book.id}
          src={book.cover_url}
          alt={`${book.title} cover`}
          title={book.title}
          author={book.author}
          size={size}
          onClick={onBookClick ? () => onBookClick(book.id) : undefined}
        />
      ))}
      
      {remainingCount > 0 && (
        <div
          className={cn(
            "flex items-center justify-center rounded-md border border-dashed border-muted-foreground/50 bg-muted/30",
            sizeClasses[size]
          )}
        >
          <span className={cn("text-muted-foreground font-medium", textSizeClasses[size])}>
            +{remainingCount}
          </span>
        </div>
      )}
    </div>
  );
}