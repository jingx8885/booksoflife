import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { ReadingProgressService } from "@/services/readingProgress";
import { z } from "zod";

// Schema for updating session progress
const updateSessionSchema = z.object({
  current_page: z.number().int().positive(),
  notes: z.string().optional()
});

// PUT /api/reading-sessions/[sessionId] - Update session progress
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = updateSessionSchema.parse(body);

    await ReadingProgressService.updateSessionProgress(
      sessionId,
      validatedData.current_page,
      validatedData.notes
    );

    return NextResponse.json({ message: "Session updated successfully" });
  } catch (error) {
    console.error("Error updating reading session:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to update session" },
      { status: 500 }
    );
  }
}