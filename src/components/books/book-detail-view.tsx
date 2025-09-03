"use client";

import { useState } from "react";
import { ArrowLeft, Calendar, Clock, BookOpen, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { BookCover } from "@/components/ui/books/book-cover";
import { ReadingSessionTracker } from "./reading-session-tracker";
import { ReadingAssistant } from "./reading-assistant";
import { BookListItem, ReadingSession } from "@/types/book";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

interface BookDetailViewProps {
  bookItem: BookListItem;
  sessions: ReadingSession[];
  activeSession: ReadingSession | null;
}

export function BookDetailView({ bookItem, sessions, activeSession }: BookDetailViewProps) {
  const t = useTranslations('book_detail');
  const tStatus = useTranslations('reading_status');
  const router = useRouter();
  const [refreshKey, setRefreshKey] = useState(0);

  const handleProgressUpdate = () => {
    // Force refresh of the component
    setRefreshKey(prev => prev + 1);
    // In a real app, you might want to refetch the data
    window.location.reload();
  };

  const formatDate = (dateString: string | Date) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'read': return 'default';
      case 'currently_reading': return 'secondary';
      case 'want_to_read': return 'outline';
      default: return 'outline';
    }
  };

  const totalReadingTime = sessions.reduce((total, session) => 
    total + (session.reading_duration_minutes || 0), 0
  );

  const totalPagesRead = sessions.reduce((total, session) => 
    total + (session.pages_read || 0), 0
  );

  return (
    <div className="space-y-6">
      {/* Navigation */}
      <Button variant="ghost" onClick={() => router.back()} className="gap-2">
        <ArrowLeft className="h-4 w-4" />
        Back to Library
      </Button>

      {/* Book Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-6">
            <BookCover
              src={bookItem.book?.cover_url}
              alt={bookItem.book?.title || "Book cover"}
              title={bookItem.book?.title}
              author={bookItem.book?.author}
              size="lg"
              className="shrink-0"
            />
            
            <div className="flex-1 space-y-4">
              <div>
                <h1 className="text-3xl font-bold">{bookItem.book?.title}</h1>
                {bookItem.book?.subtitle && (
                  <p className="text-xl text-muted-foreground mt-1">
                    {bookItem.book.subtitle}
                  </p>
                )}
                <p className="text-lg text-muted-foreground mt-2">
                  by {bookItem.book?.author}
                  {bookItem.book?.co_authors && `, ${bookItem.book.co_authors}`}
                </p>
              </div>

              {bookItem.book?.description && (
                <p className="text-muted-foreground leading-relaxed">
                  {bookItem.book.description}
                </p>
              )}

              <div className="flex flex-wrap gap-2">
                <Badge variant={getStatusColor(bookItem.reading_status)}>
                  {bookItem.reading_status === "read" ? tStatus('completed') :
                   bookItem.reading_status === "currently_reading" ? tStatus('currently_reading') :
                   bookItem.reading_status === "want_to_read" ? tStatus('want_to_read') :
                   tStatus('on_hold')}
                </Badge>
                
                {bookItem.book?.genre && (
                  <Badge variant="outline">{bookItem.book.genre}</Badge>
                )}
                
                {bookItem.book?.page_count && (
                  <Badge variant="outline">{bookItem.book.page_count} pages</Badge>
                )}
                
                {bookItem.book?.language && (
                  <Badge variant="outline">{bookItem.book.language.toUpperCase()}</Badge>
                )}

                {bookItem.personal_rating && (
                  <Badge variant="secondary" className="gap-1">
                    <Star className="h-3 w-3 fill-current" />
                    {bookItem.personal_rating}
                  </Badge>
                )}
              </div>

              {/* Reading Progress */}
              {bookItem.reading_status === "currently_reading" && bookItem.book?.page_count && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Reading Progress</span>
                    <span className="font-semibold">{bookItem.progress_percentage}%</span>
                  </div>
                  <Progress value={bookItem.progress_percentage} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    {Math.round((bookItem.progress_percentage / 100) * bookItem.book.page_count)} of {bookItem.book.page_count} pages
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reading Stats Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <Clock className="h-4 w-4" />
              Total Reading Time
            </div>
            <div className="text-2xl font-bold">
              {formatDuration(totalReadingTime)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <BookOpen className="h-4 w-4" />
              Pages Read
            </div>
            <div className="text-2xl font-bold">
              {totalPagesRead}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <Calendar className="h-4 w-4" />
              Reading Sessions
            </div>
            <div className="text-2xl font-bold">
              {sessions.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reading Tools - Session Tracker and AI Assistant */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ReadingSessionTracker 
          book={bookItem} 
          onProgressUpdate={handleProgressUpdate}
        />
        
        <ReadingAssistant 
          book={bookItem}
          currentPage={sessions[0]?.end_page || 1}
        />
      </div>

      {/* Reading Sessions History */}
      <Card>
        <CardHeader>
          <CardTitle>Reading History</CardTitle>
          <CardDescription>
            Your reading sessions for this book
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sessions.length > 0 ? (
            <div className="space-y-4">
              {sessions.map((session) => (
                <div key={session.uuid} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {formatDate(session.session_start)}
                      </span>
                      {session.status === "active" && (
                        <Badge variant="secondary" className="text-xs">Active</Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {session.session_end && (
                        <>
                          {formatDuration(session.reading_duration_minutes || 0)} • 
                          {session.pages_read} pages
                          {session.start_page && session.end_page && (
                            <> (pp. {session.start_page}-{session.end_page})</>
                          )}
                        </>
                      )}
                    </div>
                    {session.location && (
                      <div className="text-xs text-muted-foreground">
                        📍 {session.location}
                      </div>
                    )}
                    {session.mood && (
                      <div className="text-xs">
                        Mood: {session.mood}
                      </div>
                    )}
                  </div>
                  
                  {session.notes && (
                    <div className="text-sm text-muted-foreground max-w-xs">
                      "{session.notes}"
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No reading sessions yet</p>
              <p className="text-sm">Start reading to track your progress!</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Book Details */}
      <Card>
        <CardHeader>
          <CardTitle>Book Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {bookItem.book?.publisher && (
              <div>
                <span className="text-sm font-medium">Publisher:</span>
                <p className="text-muted-foreground">{bookItem.book.publisher}</p>
              </div>
            )}
            
            {bookItem.book?.publication_date && (
              <div>
                <span className="text-sm font-medium">Published:</span>
                <p className="text-muted-foreground">
                  {formatDate(bookItem.book.publication_date)}
                </p>
              </div>
            )}

            {bookItem.book?.isbn_13 && (
              <div>
                <span className="text-sm font-medium">ISBN-13:</span>
                <p className="text-muted-foreground">{bookItem.book.isbn_13}</p>
              </div>
            )}

            {bookItem.book?.isbn_10 && (
              <div>
                <span className="text-sm font-medium">ISBN-10:</span>
                <p className="text-muted-foreground">{bookItem.book.isbn_10}</p>
              </div>
            )}

            {bookItem.book?.series_name && (
              <div>
                <span className="text-sm font-medium">Series:</span>
                <p className="text-muted-foreground">
                  {bookItem.book.series_name}
                  {bookItem.book.series_number && ` #${bookItem.book.series_number}`}
                </p>
              </div>
            )}

            {bookItem.book?.format && (
              <div>
                <span className="text-sm font-medium">Format:</span>
                <p className="text-muted-foreground">{bookItem.book.format}</p>
              </div>
            )}
          </div>

          {bookItem.personal_review && (
            <div className="mt-4 pt-4 border-t">
              <span className="text-sm font-medium">Your Review:</span>
              <p className="text-muted-foreground mt-1">{bookItem.personal_review}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}