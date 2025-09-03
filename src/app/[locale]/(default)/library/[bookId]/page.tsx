import { Suspense } from "react";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { BooksService } from "@/services/books";
import { ReadingProgressService } from "@/services/readingProgress";
import { BookDetailView } from "@/components/books/book-detail-view";
import { Skeleton } from "@/components/ui/skeleton";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; bookId: string }>;
}) {
  const { bookId } = await params;
  
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { title: "Book Details" };
    }

    const userBooks = await BooksService.getUserBooks(session.user.id);
    const bookItem = userBooks.find(item => item.book_uuid === bookId);
    
    if (!bookItem?.book) {
      return { title: "Book Not Found" };
    }

    return {
      title: `${bookItem.book.title} - BooksOfLife`,
      description: bookItem.book.description || `Reading progress for ${bookItem.book.title} by ${bookItem.book.author}`,
    };
  } catch (error) {
    return { title: "Book Details" };
  }
}

export default async function BookDetailPage({
  params,
}: {
  params: Promise<{ locale: string; bookId: string }>;
}) {
  const { bookId } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    notFound();
  }

  return (
    <div className="container py-6 md:py-8">
      <Suspense fallback={<BookDetailSkeleton />}>
        <BookDetailContent bookId={bookId} userId={session.user.id} />
      </Suspense>
    </div>
  );
}

async function BookDetailContent({ bookId, userId }: { bookId: string; userId: string }) {
  try {
    // Get user's books to find this specific book
    const userBooks = await BooksService.getUserBooks(userId);
    const bookItem = userBooks.find(item => item.book_uuid === bookId);
    
    if (!bookItem) {
      notFound();
    }

    // Get reading sessions for this book
    const sessions = await ReadingProgressService.getBookReadingSessions(userId, bookId);
    
    // Get active session if any
    const activeSession = await ReadingProgressService.getActiveSession(userId, bookId);

    return (
      <BookDetailView 
        bookItem={bookItem}
        sessions={sessions}
        activeSession={activeSession}
      />
    );
  } catch (error) {
    console.error("Error loading book details:", error);
    notFound();
  }
}

function BookDetailSkeleton() {
  return (
    <div className="space-y-6">
      {/* Book Header */}
      <div className="flex gap-6">
        <Skeleton className="w-32 h-48" />
        <div className="flex-1 space-y-4">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-20 w-full" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-12" />
          </div>
        </div>
      </div>

      {/* Reading Tracker */}
      <Skeleton className="h-96 w-full" />

      {/* Reading Sessions */}
      <Skeleton className="h-64 w-full" />
    </div>
  );
}