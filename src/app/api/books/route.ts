import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { BooksService } from "@/services/books";
import { BookFormData } from "@/types/book";
import { z } from "zod";

// Schema for book creation
const createBookSchema = z.object({
  title: z.string().min(1, "Title is required").max(500),
  subtitle: z.string().optional(),
  author: z.string().min(1, "Author is required").max(500),
  co_authors: z.string().optional(),
  isbn_10: z.string().optional(),
  isbn_13: z.string().optional(),
  genre: z.string().optional(),
  sub_genre: z.string().optional(),
  language: z.string().default("en"),
  publisher: z.string().optional(),
  publication_date: z.string().optional(),
  page_count: z.number().int().positive().optional(),
  description: z.string().optional(),
  cover_url: z.string().url().optional(),
  series_name: z.string().optional(),
  series_number: z.number().int().positive().optional(),
  edition: z.string().optional(),
  format: z.string().optional()
});

// GET /api/books - Get user's books
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");

    let books;
    if (query) {
      books = await BooksService.searchUserBooks(session.user.id, query);
    } else {
      books = await BooksService.getUserBooks(session.user.id);
    }

    return NextResponse.json({ books });
  } catch (error) {
    console.error("Error fetching books:", error);
    return NextResponse.json(
      { error: "Failed to fetch books" },
      { status: 500 }
    );
  }
}

// POST /api/books - Create a new book
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = createBookSchema.parse(body);

    // Create the book
    const book = await BooksService.createBook(validatedData as BookFormData, session.user.id);

    // Add to user's library
    const bookListItem = await BooksService.addBookToUserLibrary(
      book.uuid,
      session.user.id,
      body.reading_status || "want_to_read"
    );

    return NextResponse.json({ book: bookListItem }, { status: 201 });
  } catch (error) {
    console.error("Error creating book:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message === "Book already in library") {
      return NextResponse.json(
        { error: "Book already exists in your library" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create book" },
      { status: 500 }
    );
  }
}