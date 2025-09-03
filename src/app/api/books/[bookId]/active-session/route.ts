import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { ReadingProgressService } from "@/services/readingProgress";

// GET /api/books/[bookId]/active-session - Get active reading session for a book
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

    const activeSession = await ReadingProgressService.getActiveSession(
      session.user.id,
      bookId
    );

    return NextResponse.json({ session: activeSession });
  } catch (error) {
    console.error("Error fetching active session:", error);
    return NextResponse.json(
      { error: "Failed to fetch active session" },
      { status: 500 }
    );
  }
}