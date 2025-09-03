import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { ReadingAssistantService } from "@/services/readingAssistant";
import { z } from "zod";

// Schema for reading assistant request
const readingAssistantSchema = z.object({
  book_uuid: z.string().uuid(),
  question: z.string().min(1),
  context: z.object({
    currentChapter: z.string().optional(),
    currentPage: z.number().int().positive().optional(),
    readingProgress: z.number().min(0).max(100).optional(),
  }).optional()
});

// POST /api/reading-assistant - Ask a question to the reading assistant
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = readingAssistantSchema.parse(body);

    const response = await ReadingAssistantService.answerBookQuestion(
      session.user.id,
      validatedData.book_uuid,
      validatedData.question,
      validatedData.context
    );

    return NextResponse.json({ response });
  } catch (error) {
    console.error("Error with reading assistant:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to get AI response" },
      { status: 500 }
    );
  }
}