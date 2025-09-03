import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { BooksService } from "@/services/books";
import { z } from "zod";

// Schema for book list creation
const createBookListSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  description: z.string().optional(),
  is_public: z.boolean().default(false)
});

// GET /api/book-lists - Get user's book lists
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const bookLists = await BooksService.getUserBookLists(session.user.id);
    return NextResponse.json({ bookLists });
  } catch (error) {
    console.error("Error fetching book lists:", error);
    return NextResponse.json(
      { error: "Failed to fetch book lists" },
      { status: 500 }
    );
  }
}

// POST /api/book-lists - Create a new book list
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createBookListSchema.parse(body);

    const bookList = await BooksService.createBookList(
      session.user.id,
      validatedData.name,
      validatedData.description,
      validatedData.is_public
    );

    return NextResponse.json({ bookList }, { status: 201 });
  } catch (error) {
    console.error("Error creating book list:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create book list" },
      { status: 500 }
    );
  }
}