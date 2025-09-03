import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { ReadingAssistantService } from "@/services/readingAssistant";
import { z } from "zod";

// Schema for streaming reading assistant request
const streamingAssistantSchema = z.object({
  book_uuid: z.string().uuid(),
  question: z.string().min(1),
  context: z.object({
    currentChapter: z.string().optional(),
    currentPage: z.number().int().positive().optional(),
    readingProgress: z.number().min(0).max(100).optional(),
  }).optional()
});

// POST /api/reading-assistant/stream - Stream a response from the reading assistant
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = streamingAssistantSchema.parse(body);

    // Create a readable stream
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of ReadingAssistantService.streamBookQuestion(
            session.user.id,
            validatedData.book_uuid,
            validatedData.question,
            validatedData.context
          )) {
            // Send each chunk as Server-Sent Event
            const data = `data: ${JSON.stringify(chunk)}\n\n`;
            controller.enqueue(new TextEncoder().encode(data));
          }
        } catch (error) {
          console.error("Error streaming reading assistant response:", error);
          const errorData = `data: ${JSON.stringify({ error: "Stream error" })}\n\n`;
          controller.enqueue(new TextEncoder().encode(errorData));
        } finally {
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error("Error setting up reading assistant stream:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to setup AI stream" },
      { status: 500 }
    );
  }
}