import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { BooksService } from "@/services/books";
import { z } from "zod";

// Schema for progress update
const updateProgressSchema = z.object({
  progress_percentage: z.number().min(0).max(100).optional(),
  reading_status: z.enum(['want_to_read', 'currently_reading', 'read', 'paused', 'abandoned']).optional(),
  current_page: z.number().int().positive().optional(),
  total_pages: z.number().int().positive().optional(),
  date_started: z.string().optional(),
  date_completed: z.string().optional()
});

// PUT /api/books/[bookId]/progress - Update reading progress
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ bookId: string }> }
) {
  try {
    const { bookId } = await params;
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = updateProgressSchema.parse(body);

    // Calculate progress percentage if current_page and total_pages provided
    if (validatedData.current_page && validatedData.total_pages) {
      validatedData.progress_percentage = Math.round(
        (validatedData.current_page / validatedData.total_pages) * 100
      );
    }

    // Auto-set date_completed if status is 'read' and not provided
    if (validatedData.reading_status === 'read' && !validatedData.date_completed) {
      validatedData.date_completed = new Date().toISOString();
    }

    // Auto-set date_started if status is 'currently_reading' and not provided
    if (validatedData.reading_status === 'currently_reading' && !validatedData.date_started) {
      validatedData.date_started = new Date().toISOString();
    }

    await BooksService.updateReadingProgress(session.user.id, bookId, validatedData);

    return NextResponse.json({ message: "Progress updated successfully" });
  } catch (error) {
    console.error("Error updating reading progress:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to update progress" },
      { status: 500 }
    );
  }
}