import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { ReadingAssistantService } from "@/services/readingAssistant";
import { BooksService } from "@/services/books";

// GET /api/books/[bookId]/overview - Generate book overview
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bookId: string }> }
) {
  try {
    const { bookId } = await params;
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's books to find this specific book
    const userBooks = await BooksService.getUserBooks(session.user.id);
    const bookItem = userBooks.find(item => item.book_uuid === bookId);
    
    if (!bookItem?.book) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }

    const overview = await ReadingAssistantService.generateBookOverview(bookItem.book);

    return NextResponse.json({ overview });
  } catch (error) {
    console.error("Error generating book overview:", error);
    return NextResponse.json(
      { error: "Failed to generate book overview" },
      { status: 500 }
    );
  }
}