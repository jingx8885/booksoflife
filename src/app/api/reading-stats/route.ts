import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { ReadingProgressService } from "@/services/readingProgress";

// GET /api/reading-stats - Get user's reading statistics
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const timeframe = searchParams.get("timeframe") || "month";

    const stats = await ReadingProgressService.getUserReadingStats(
      session.user.id,
      timeframe
    );

    return NextResponse.json({ stats });
  } catch (error) {
    console.error("Error fetching reading stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch reading statistics" },
      { status: 500 }
    );
  }
}