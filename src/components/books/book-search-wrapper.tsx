"use client";

import { useState, useCallback, useEffect } from "react";
import { Search, BookOpen, X } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BookListItem } from "@/types/book";
import { useTranslations } from "next-intl";

interface BookSearchWrapperProps {
  autoFocus?: boolean;
  placeholder?: string;
}

export function BookSearchWrapper({ autoFocus = false, placeholder }: BookSearchWrapperProps) {
  const t = useTranslations('book_search');
  const tStatus = useTranslations('reading_status');
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<BookListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const debouncedQuery = useDebounce(query, 500);

  const searchBooks = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setShowResults(false);
      setHasSearched(false);
      return;
    }

    setIsLoading(true);
    setHasSearched(true);

    try {
      const response = await fetch(`/api/books?q=${encodeURIComponent(searchQuery)}`);
      
      if (response.ok) {
        const data = await response.json();
        setResults(data.books || []);
        setShowResults(true);
      } else {
        setResults([]);
        setShowResults(true);
      }
    } catch (error) {
      console.error("Error searching books:", error);
      setResults([]);
      setShowResults(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debouncedQuery) {
      searchBooks(debouncedQuery);
    }
  }, [debouncedQuery, searchBooks]);

  const handleClearSearch = () => {
    setQuery("");
    setResults([]);
    setShowResults(false);
    setHasSearched(false);
  };

  return (
    <div className="w-full space-y-4">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder || "Search your library by title, author, or ISBN..."}
          className="pl-10 pr-10"
          autoFocus={autoFocus}
        />
        {query && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearSearch}
            className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Search Results */}
      {showResults && (
        <div className="space-y-4">
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      <div className="h-20 w-16 bg-muted rounded" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-muted rounded w-3/4" />
                        <div className="h-3 bg-muted rounded w-1/2" />
                        <div className="h-3 bg-muted rounded w-full" />
                        <div className="h-3 bg-muted rounded w-2/3" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : results.length > 0 ? (
            <div className="space-y-3">
              {results.map((item) => (
                <Card key={item.book_uuid} className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      {/* Book Cover */}
                      <div className="w-16 h-20 bg-muted rounded flex-shrink-0 flex items-center justify-center">
                        {item.book?.cover_url ? (
                          <img
                            src={item.book.cover_url}
                            alt={item.book.title}
                            className="w-full h-full object-cover rounded"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              target.nextElementSibling?.classList.remove('hidden');
                            }}
                          />
                        ) : null}
                        <BookOpen className={`h-8 w-8 text-muted-foreground ${item.book?.cover_url ? 'hidden' : ''}`} />
                      </div>

                      {/* Book Details */}
                      <div className="flex-1 space-y-2">
                        <div>
                          <h3 className="font-semibold text-lg leading-tight">{item.book?.title}</h3>
                          {item.book?.subtitle && (
                            <p className="text-sm text-muted-foreground">{item.book.subtitle}</p>
                          )}
                          <p className="text-sm text-muted-foreground">
                            by {item.book?.author}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-1">
                          <Badge 
                            variant={
                              item.reading_status === "read" ? "default" :
                              item.reading_status === "currently_reading" ? "secondary" :
                              "outline"
                            }
                            className="text-xs"
                          >
                            {item.reading_status === "read" ? tStatus('completed') :
                             item.reading_status === "currently_reading" ? tStatus('currently_reading') :
                             item.reading_status === "want_to_read" ? tStatus('want_to_read') :
                             tStatus('on_hold')}
                          </Badge>
                          {item.book?.genre && (
                            <Badge variant="outline" className="text-xs">
                              {item.book.genre}
                            </Badge>
                          )}
                          {item.book?.page_count && (
                            <Badge variant="outline" className="text-xs">
                              {item.book.page_count} pages
                            </Badge>
                          )}
                        </div>

                        {item.reading_status === "currently_reading" && (
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>Progress</span>
                              <span>{item.progress_percentage}%</span>
                            </div>
                            <Progress value={item.progress_percentage} className="h-1.5" />
                          </div>
                        )}

                        {item.book?.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {item.book.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : hasSearched ? (
            <Card>
              <CardContent className="p-8 text-center">
                <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No books found</h3>
                <p className="text-muted-foreground">
                  No books in your library match "{query}". Try adding the book to your library first.
                </p>
              </CardContent>
            </Card>
          ) : null}
        </div>
      )}
    </div>
  );
}
