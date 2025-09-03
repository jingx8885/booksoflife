import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { ReadingProgressService } from "@/services/readingProgress";

// GET /api/books/[bookId]/sessions - Get reading sessions for a book
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

    const sessions = await ReadingProgressService.getBookReadingSessions(
      session.user.id,
      bookId
    );

    return NextResponse.json({ sessions });
  } catch (error) {
    console.error("Error fetching reading sessions:", error);
    return NextResponse.json(
      { error: "Failed to fetch reading sessions" },
      { status: 500 }
    );
  }
}