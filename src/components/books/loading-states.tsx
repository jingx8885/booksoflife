"use client";

import { BookOpen, AlertCircle, RefreshCw, Wifi } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// Book Card Skeleton
export function BookCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex gap-3">
          <Skeleton className="w-16 h-20 rounded" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-2 w-full" />
            <div className="flex gap-1">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-12" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Book Grid Skeleton
export function BookGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {[...Array(count)].map((_, i) => (
        <BookCardSkeleton key={i} />
      ))}
    </div>
  );
}

// Library Stats Skeleton
export function LibraryStatsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {[...Array(4)].map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-4 rounded" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-16 mb-2" />
            <Skeleton className="h-3 w-32" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Search Results Skeleton
export function SearchResultsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {[...Array(count)].map((_, i) => (
        <Card key={i} className="animate-pulse">
          <CardContent className="p-4">
            <div className="flex gap-4">
              <Skeleton className="h-20 w-16 rounded" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-2/3" />
                <div className="flex gap-2 pt-2">
                  <Skeleton className="h-8 w-20" />
                  <Skeleton className="h-8 w-24" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Reading Progress Skeleton
export function ReadingProgressSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-4">
          <Skeleton className="w-20 h-28 rounded" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <div className="flex gap-2 mt-2">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-5 w-16" />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-8" />
          </div>
          <Skeleton className="h-3 w-full" />
        </div>
        <div className="flex gap-2">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-8 w-20" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Book Form Skeleton
export function BookFormSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Cover skeleton */}
        <div className="space-y-4">
          <Skeleton className="h-4 w-20" />
          <div className="flex flex-col items-center space-y-4">
            <Skeleton className="w-32 h-40 rounded" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>

        {/* Form skeleton */}
        <div className="lg:col-span-2 space-y-6">
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <div className="grid gap-4 md:grid-cols-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

// Generic Loading Spinner
export function LoadingSpinner({ 
  size = "md", 
  className 
}: { 
  size?: "sm" | "md" | "lg"; 
  className?: string 
}) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8"
  };

  return (
    <RefreshCw 
      className={cn("animate-spin", sizeClasses[size], className)} 
    />
  );
}

// Loading State Card
export function LoadingCard({ 
  title = "Loading...", 
  description,
  className 
}: { 
  title?: string; 
  description?: string;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardContent className="p-8 text-center">
        <LoadingSpinner size="lg" className="mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        {description && (
          <p className="text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

// Error States
export function BookErrorCard({ 
  title = "Something went wrong", 
  description = "We couldn't load the book information. Please try again.",
  onRetry,
  className 
}: { 
  title?: string; 
  description?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardContent className="p-8 text-center">
        <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-muted-foreground mb-4">{description}</p>
        {onRetry && (
          <Button onClick={onRetry} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export function NetworkErrorCard({ onRetry }: { onRetry?: () => void }) {
  return (
    <Alert variant="destructive">
      <Wifi className="h-4 w-4" />
      <AlertTitle>Network Error</AlertTitle>
      <AlertDescription className="mt-2">
        <p className="mb-3">
          Unable to connect to the server. Please check your internet connection and try again.
        </p>
        {onRetry && (
          <Button onClick={onRetry} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}

export function ValidationErrorCard({ 
  errors,
  onDismiss 
}: { 
  errors: string[];
  onDismiss?: () => void;
}) {
  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Validation Errors</AlertTitle>
      <AlertDescription className="mt-2">
        <ul className="list-disc list-inside space-y-1">
          {errors.map((error, index) => (
            <li key={index}>{error}</li>
          ))}
        </ul>
        {onDismiss && (
          <Button 
            onClick={onDismiss} 
            variant="outline" 
            size="sm" 
            className="mt-3"
          >
            Dismiss
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}

// Empty States
export function EmptyLibraryCard() {
  return (
    <Card>
      <CardContent className="p-8 text-center">
        <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Your library is empty</h3>
        <p className="text-muted-foreground mb-4">
          Start building your personal library by adding some books
        </p>
        <Button>
          Add Your First Book
        </Button>
      </CardContent>
    </Card>
  );
}

export function EmptySearchResults({ 
  query,
  onClearSearch 
}: { 
  query?: string;
  onClearSearch?: () => void;
}) {
  return (
    <Card>
      <CardContent className="p-8 text-center">
        <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">No books found</h3>
        <p className="text-muted-foreground mb-4">
          {query 
            ? `No results found for "${query}". Try adjusting your search terms.`
            : "No books match your current filters"
          }
        </p>
        {onClearSearch && (
          <Button onClick={onClearSearch} variant="outline">
            Clear Search
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export function EmptyBookList({ 
  listName,
  onAddBooks 
}: { 
  listName: string;
  onAddBooks?: () => void;
}) {
  return (
    <Card>
      <CardContent className="p-8 text-center">
        <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">
          No books in "{listName}"
        </h3>
        <p className="text-muted-foreground mb-4">
          This list is empty. Add some books to get started.
        </p>
        {onAddBooks && (
          <Button onClick={onAddBooks}>
            Add Books to List
          </Button>
        )}
      </CardContent>
    </Card>
  );
}