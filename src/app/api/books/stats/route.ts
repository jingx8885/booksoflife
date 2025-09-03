import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { BooksService } from "@/services/books";

// GET /api/books/stats - Get user's library statistics
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const stats = await BooksService.getUserLibraryStats(session.user.id);
    return NextResponse.json({ stats });
  } catch (error) {
    console.error("Error fetching library stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch library statistics" },
      { status: 500 }
    );
  }
}