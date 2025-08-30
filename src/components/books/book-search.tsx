"use client";

import { useState, useCallback, useEffect } from "react";
import { Search, BookOpen, Filter, X } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { BookSearchFilters, ExternalBookResult } from "@/types/book";

interface BookSearchProps {
  onBookSelect?: (book: ExternalBookResult) => void;
  onAddToLibrary?: (book: ExternalBookResult) => void;
  placeholder?: string;
  showFilters?: boolean;
  autoFocus?: boolean;
}

export function BookSearch({
  onBookSelect,
  onAddToLibrary,
  placeholder = "Search books by title, author, or ISBN...",
  showFilters = true,
  autoFocus = false
}: BookSearchProps) {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<BookSearchFilters>({});
  const [results, setResults] = useState<ExternalBookResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const debouncedQuery = useDebounce(query, 500);

  const searchBooks = useCallback(async (searchQuery: string, searchFilters: BookSearchFilters = {}) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setShowResults(false);
      setHasSearched(false);
      return;
    }

    setIsLoading(true);
    setHasSearched(true);

    try {
      // Mock search results for now - replace with actual API call
      const mockResults: ExternalBookResult[] = [
        {
          id: "1",
          title: "The Great Gatsby",
          authors: ["F. Scott Fitzgerald"],
          description: "A classic American novel about the Jazz Age",
          published_date: "1925",
          page_count: 180,
          categories: ["Fiction", "Classic"],
          language: "en",
          isbn_10: "0743273567",
          isbn_13: "9780743273565",
          image_links: {
            thumbnail: "https://books.google.com/books/content?id=example&printsec=frontcover&img=1&zoom=1&source=gbs_api"
          },
          publisher: "Scribner",
          source: "google_books"
        },
        {
          id: "2", 
          title: "To Kill a Mockingbird",
          authors: ["Harper Lee"],
          description: "A gripping tale of racial injustice and loss of innocence",
          published_date: "1960",
          page_count: 376,
          categories: ["Fiction", "Classic"],
          language: "en",
          isbn_10: "0061120081",
          isbn_13: "9780061120084",
          image_links: {
            thumbnail: "https://books.google.com/books/content?id=example2&printsec=frontcover&img=1&zoom=1&source=gbs_api"
          },
          publisher: "J.B. Lippincott & Co.",
          source: "google_books"
        }
      ].filter(book => 
        book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        book.authors.some(author => author.toLowerCase().includes(searchQuery.toLowerCase()))
      );

      setResults(mockResults);
      setShowResults(true);
    } catch (error) {
      console.error("Error searching books:", error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debouncedQuery) {
      searchBooks(debouncedQuery, filters);
    }
  }, [debouncedQuery, filters, searchBooks]);

  const handleClearSearch = () => {
    setQuery("");
    setResults([]);
    setShowResults(false);
    setHasSearched(false);
  };

  const handleFilterChange = (key: keyof BookSearchFilters, value: string) => {
    const newFilters = { ...filters };
    if (value === "all" || !value) {
      delete newFilters[key];
    } else {
      newFilters[key] = value;
    }
    setFilters(newFilters);
  };

  return (
    <div className="w-full space-y-4">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
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

      {/* Filters */}
      {showFilters && (
        <div className="flex flex-wrap gap-2">
          <Select onValueChange={(value) => handleFilterChange("language", value)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Language" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Languages</SelectItem>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="es">Spanish</SelectItem>
              <SelectItem value="fr">French</SelectItem>
              <SelectItem value="de">German</SelectItem>
              <SelectItem value="zh">Chinese</SelectItem>
            </SelectContent>
          </Select>

          <Select onValueChange={(value) => handleFilterChange("genre", value)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Genre" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Genres</SelectItem>
              <SelectItem value="fiction">Fiction</SelectItem>
              <SelectItem value="non-fiction">Non-fiction</SelectItem>
              <SelectItem value="mystery">Mystery</SelectItem>
              <SelectItem value="science-fiction">Sci-Fi</SelectItem>
              <SelectItem value="romance">Romance</SelectItem>
              <SelectItem value="history">History</SelectItem>
              <SelectItem value="biography">Biography</SelectItem>
            </SelectContent>
          </Select>

          {Object.keys(filters).length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFilters({})}
              className="h-10"
            >
              <Filter className="mr-2 h-4 w-4" />
              Clear Filters
            </Button>
          )}
        </div>
      )}

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
              {results.map((book) => (
                <Card key={book.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      {/* Book Cover */}
                      <div className="w-16 h-20 bg-muted rounded flex-shrink-0 flex items-center justify-center">
                        {book.image_links?.thumbnail ? (
                          <img
                            src={book.image_links.thumbnail}
                            alt={book.title}
                            className="w-full h-full object-cover rounded"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              target.nextElementSibling?.classList.remove('hidden');
                            }}
                          />
                        ) : null}
                        <BookOpen className={`h-8 w-8 text-muted-foreground ${book.image_links?.thumbnail ? 'hidden' : ''}`} />
                      </div>

                      {/* Book Details */}
                      <div className="flex-1 space-y-2">
                        <div>
                          <h3 className="font-semibold text-lg leading-tight">{book.title}</h3>
                          {book.subtitle && (
                            <p className="text-sm text-muted-foreground">{book.subtitle}</p>
                          )}
                          <p className="text-sm text-muted-foreground">
                            by {book.authors.join(", ")}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-1">
                          {book.categories?.slice(0, 3).map((category) => (
                            <Badge key={category} variant="secondary" className="text-xs">
                              {category}
                            </Badge>
                          ))}
                          {book.published_date && (
                            <Badge variant="outline" className="text-xs">
                              {new Date(book.published_date).getFullYear()}
                            </Badge>
                          )}
                          {book.page_count && (
                            <Badge variant="outline" className="text-xs">
                              {book.page_count} pages
                            </Badge>
                          )}
                        </div>

                        {book.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {book.description}
                          </p>
                        )}

                        {/* Actions */}
                        <div className="flex gap-2 pt-2">
                          {onBookSelect && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onBookSelect(book)}
                            >
                              View Details
                            </Button>
                          )}
                          {onAddToLibrary && (
                            <Button
                              size="sm"
                              onClick={() => onAddToLibrary(book)}
                            >
                              Add to Library
                            </Button>
                          )}
                        </div>
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
                  Try adjusting your search terms or filters
                </p>
              </CardContent>
            </Card>
          ) : null}
        </div>
      )}
    </div>
  );
}