import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { ReadingAssistantService } from "@/services/readingAssistant";
import { database as db } from "@/db";
import { ai_conversations } from "@/db/schema";
import { and, eq } from "drizzle-orm";

// GET /api/reading-assistant/conversation/[bookId] - Get conversation history
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

    // Find conversation for this user and book
    const [conversation] = await db
      .select()
      .from(ai_conversations)
      .where(
        and(
          eq(ai_conversations.user_uuid, session.user.id),
          eq(ai_conversations.book_uuid, bookId)
        )
      )
      .limit(1);

    if (!conversation) {
      return NextResponse.json({ messages: [] });
    }

    const messages = await ReadingAssistantService.getConversationHistory(
      conversation.uuid,
      50
    );

    return NextResponse.json({ messages });
  } catch (error) {
    console.error("Error fetching conversation history:", error);
    return NextResponse.json(
      { error: "Failed to fetch conversation history" },
      { status: 500 }
    );
  }
}

// DELETE /api/reading-assistant/conversation/[bookId] - Clear conversation history
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ bookId: string }> }
) {
  try {
    const { bookId } = await params;
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find conversation for this user and book
    const [conversation] = await db
      .select()
      .from(ai_conversations)
      .where(
        and(
          eq(ai_conversations.user_uuid, session.user.id),
          eq(ai_conversations.book_uuid, bookId)
        )
      )
      .limit(1);

    if (conversation) {
      await ReadingAssistantService.clearConversationHistory(conversation.uuid);
    }

    return NextResponse.json({ message: "Conversation history cleared" });
  } catch (error) {
    console.error("Error clearing conversation history:", error);
    return NextResponse.json(
      { error: "Failed to clear conversation history" },
      { status: 500 }
    );
  }
}