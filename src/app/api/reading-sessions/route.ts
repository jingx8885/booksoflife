import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { ReadingProgressService } from "@/services/readingProgress";
import { z } from "zod";

// Schema for starting a reading session
const startSessionSchema = z.object({
  book_uuid: z.string().uuid(),
  start_page: z.number().int().positive().optional(),
  location: z.string().optional()
});

// Schema for ending a reading session
const endSessionSchema = z.object({
  session_uuid: z.string().uuid(),
  end_page: z.number().int().positive().optional(),
  notes: z.string().optional(),
  mood: z.string().optional()
});

// POST /api/reading-sessions - Start a new reading session
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const action = body.action;

    if (action === "start") {
      const validatedData = startSessionSchema.parse(body);
      
      const readingSession = await ReadingProgressService.startReadingSession(
        session.user.id,
        validatedData.book_uuid,
        validatedData.start_page,
        validatedData.location
      );

      return NextResponse.json({ session: readingSession }, { status: 201 });
    }

    if (action === "end") {
      const validatedData = endSessionSchema.parse(body);
      
      const readingSession = await ReadingProgressService.endReadingSession(
        session.user.id,
        validatedData.session_uuid,
        validatedData.end_page,
        validatedData.notes,
        validatedData.mood
      );

      return NextResponse.json({ session: readingSession });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error managing reading session:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to manage reading session" },
      { status: 500 }
    );
  }
}