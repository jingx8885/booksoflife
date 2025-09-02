"use client";

import { useState } from "react";
import { Star, Heart, Share2, Edit, MoreHorizontal, Calendar, BookOpen, User, Building2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { BookCover } from "@/components/ui/books/book-cover";
import { ReadingProgress } from "./reading-progress";
import { Book, BookListItem, ReadingProgress as ReadingProgressType } from "@/types/book";

interface BookDetailProps {
  book: Book;
  bookListItem?: BookListItem;
  readingProgress?: ReadingProgressType;
  onUpdateProgress?: (progress: Partial<ReadingProgressType>) => void;
  onAddToList?: (listUuid: string) => void;
  onEdit?: () => void;
  onDelete?: () => void;
  className?: string;
}

export function BookDetail({
  book,
  bookListItem,
  readingProgress,
  onUpdateProgress,
  onAddToList,
  onEdit,
  onDelete,
  className
}: BookDetailProps) {
  const [activeTab, setActiveTab] = useState("overview");

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Unknown";
    return new Date(dateString).toLocaleDateString();
  };

  const getRatingStars = (rating?: number) => {
    if (!rating) return null;
    return [...Array(5)].map((_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
        }`}
      />
    ));
  };

  return (
    <div className={className}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Book Cover */}
          <div className="flex-shrink-0 flex justify-center lg:justify-start">
            <BookCover
              src={book.cover_url}
              alt={book.title}
              title={book.title}
              author={book.author}
              size="xl"
              className="shadow-lg"
            />
          </div>

          {/* Book Info */}
          <div className="flex-1 space-y-4">
            <div className="space-y-2">
              <h1 className="text-2xl md:text-3xl font-bold leading-tight">
                {book.title}
              </h1>
              {book.subtitle && (
                <h2 className="text-lg md:text-xl text-muted-foreground">
                  {book.subtitle}
                </h2>
              )}
              <p className="text-lg text-muted-foreground">
                by {book.author}
                {book.co_authors && `, ${book.co_authors}`}
              </p>
            </div>

            {/* Metadata */}
            <div className="flex flex-wrap gap-2">
              {book.genre && (
                <Badge variant="secondary">{book.genre}</Badge>
              )}
              {book.sub_genre && (
                <Badge variant="outline">{book.sub_genre}</Badge>
              )}
              {book.page_count && (
                <Badge variant="outline">{book.page_count} pages</Badge>
              )}
              {book.format && (
                <Badge variant="outline">{book.format}</Badge>
              )}
              {book.language && book.language !== "en" && (
                <Badge variant="outline">{book.language}</Badge>
              )}
            </div>

            {/* Personal Rating */}
            {bookListItem?.personal_rating && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">My Rating:</span>
                <div className="flex items-center gap-1">
                  {getRatingStars(bookListItem.personal_rating)}
                  <span className="text-sm text-muted-foreground ml-1">
                    ({bookListItem.personal_rating}/5)
                  </span>
                </div>
              </div>
            )}

            {/* Reading Status */}
            {bookListItem && (
              <div className="flex items-center gap-4">
                <Badge 
                  variant={
                    bookListItem.reading_status === "read" ? "default" :
                    bookListItem.reading_status === "currently_reading" ? "secondary" :
                    "outline"
                  }
                  className="text-sm"
                >
                  {bookListItem.reading_status.replace("_", " ")}
                </Badge>
                {bookListItem.progress_percentage > 0 && (
                  <span className="text-sm text-muted-foreground">
                    {bookListItem.progress_percentage}% complete
                  </span>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              {bookListItem?.reading_status === "currently_reading" && (
                <Button>Continue Reading</Button>
              )}
              {!bookListItem && (
                <Button onClick={() => onAddToList?.("default")}>
                  Add to Library
                </Button>
              )}
              <Button variant="outline" size="sm">
                <Heart className="h-4 w-4 mr-2" />
                Favorite
              </Button>
              <Button variant="outline" size="sm">
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onEdit && (
                    <DropdownMenuItem onClick={onEdit}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Book
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem>Add to List</DropdownMenuItem>
                  <DropdownMenuItem>Export Data</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {onDelete && (
                    <DropdownMenuItem 
                      onClick={onDelete}
                      className="text-destructive focus:text-destructive"
                    >
                      Delete Book
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        <Separator />

        {/* Tabs Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 lg:w-[400px]">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="progress">Progress</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Description */}
            {book.description && (
              <Card>
                <CardHeader>
                  <CardTitle>Description</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {book.description}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Quick Info */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Publication Info</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {book.publisher && (
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span>{book.publisher}</span>
                    </div>
                  )}
                  {book.publication_date && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{formatDate(book.publication_date)}</span>
                    </div>
                  )}
                  {book.page_count && (
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-muted-foreground" />
                      <span>{book.page_count} pages</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Identifiers</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {book.isbn_13 && (
                    <div>
                      <span className="font-medium">ISBN-13:</span>
                      <span className="ml-2">{book.isbn_13}</span>
                    </div>
                  )}
                  {book.isbn_10 && (
                    <div>
                      <span className="font-medium">ISBN-10:</span>
                      <span className="ml-2">{book.isbn_10}</span>
                    </div>
                  )}
                  {book.goodreads_id && (
                    <div>
                      <span className="font-medium">Goodreads ID:</span>
                      <span className="ml-2">{book.goodreads_id}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Series Info */}
            {book.series_name && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Series Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">
                    <span className="font-medium">{book.series_name}</span>
                    {book.series_number && (
                      <span className="text-muted-foreground ml-2">
                        Book {book.series_number}
                      </span>
                    )}
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="progress" className="space-y-6">
            {readingProgress ? (
              <ReadingProgress
                book={book}
                progress={readingProgress}
                onUpdateProgress={onUpdateProgress}
              />
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No reading progress</h3>
                  <p className="text-muted-foreground mb-4">
                    Start reading this book to track your progress
                  </p>
                  <Button>Start Reading</Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="notes" className="space-y-6">
            <Card>
              <CardContent className="p-8 text-center">
                <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No notes yet</h3>
                <p className="text-muted-foreground mb-4">
                  Start taking notes while reading this book
                </p>
                <Button>Add First Note</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="details" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Book Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Title</span>
                      <p className="text-sm">{book.title}</p>
                    </div>
                    {book.subtitle && (
                      <div>
                        <span className="text-sm font-medium text-muted-foreground">Subtitle</span>
                        <p className="text-sm">{book.subtitle}</p>
                      </div>
                    )}
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Author(s)</span>
                      <p className="text-sm">{book.author}</p>
                      {book.co_authors && (
                        <p className="text-sm text-muted-foreground">{book.co_authors}</p>
                      )}
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Genre</span>
                      <p className="text-sm">
                        {book.genre || "Not specified"}
                        {book.sub_genre && ` > ${book.sub_genre}`}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Language</span>
                      <p className="text-sm">{book.language || "Not specified"}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Publisher</span>
                      <p className="text-sm">{book.publisher || "Not specified"}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Publication Date</span>
                      <p className="text-sm">{formatDate(book.publication_date)}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Pages</span>
                      <p className="text-sm">{book.page_count || "Not specified"}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Format</span>
                      <p className="text-sm">{book.format || "Not specified"}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Edition</span>
                      <p className="text-sm">{book.edition || "Not specified"}</p>
                    </div>
                  </div>
                </div>
                
                {(book.isbn_10 || book.isbn_13 || book.goodreads_id || book.google_books_id || book.amazon_asin) && (
                  <>
                    <Separator />
                    <div>
                      <span className="text-sm font-medium text-muted-foreground mb-2 block">External IDs</span>
                      <div className="grid gap-2 text-sm">
                        {book.isbn_10 && (
                          <div className="flex justify-between">
                            <span>ISBN-10:</span>
                            <span className="font-mono">{book.isbn_10}</span>
                          </div>
                        )}
                        {book.isbn_13 && (
                          <div className="flex justify-between">
                            <span>ISBN-13:</span>
                            <span className="font-mono">{book.isbn_13}</span>
                          </div>
                        )}
                        {book.goodreads_id && (
                          <div className="flex justify-between">
                            <span>Goodreads:</span>
                            <span className="font-mono">{book.goodreads_id}</span>
                          </div>
                        )}
                        {book.google_books_id && (
                          <div className="flex justify-between">
                            <span>Google Books:</span>
                            <span className="font-mono">{book.google_books_id}</span>
                          </div>
                        )}
                        {book.amazon_asin && (
                          <div className="flex justify-between">
                            <span>Amazon ASIN:</span>
                            <span className="font-mono">{book.amazon_asin}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}