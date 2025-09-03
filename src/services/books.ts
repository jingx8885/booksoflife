import { database as db } from "@/db";
import { books, book_lists, book_list_items, reading_sessions, reading_notes } from "@/db/schema";
import { Book, BookList, BookListItem, BookFormData, ReadingSession, ReadingNote, ReadingProgress } from "@/types/book";
import { eq, and, desc, sql, ilike, or } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

export class BooksService {
  // Book CRUD operations
  static async createBook(bookData: BookFormData, createdBy: string): Promise<Book> {
    const bookUuid = uuidv4();
    const now = new Date().toISOString();

    const [newBook] = await db.insert(books).values({
      uuid: bookUuid,
      title: bookData.title,
      subtitle: bookData.subtitle,
      author: bookData.author,
      co_authors: bookData.co_authors,
      isbn_10: bookData.isbn_10,
      isbn_13: bookData.isbn_13,
      genre: bookData.genre,
      sub_genre: bookData.sub_genre,
      language: bookData.language,
      publisher: bookData.publisher,
      publication_date: bookData.publication_date ? new Date(bookData.publication_date) : undefined,
      page_count: bookData.page_count,
      description: bookData.description,
      cover_url: bookData.cover_url,
      series_name: bookData.series_name,
      series_number: bookData.series_number,
      edition: bookData.edition,
      format: bookData.format,
      status: "active",
      created_by: createdBy,
      created_at: new Date(now),
      updated_at: new Date(now)
    }).returning();

    return newBook as Book;
  }

  static async getUserBooks(userUuid: string): Promise<BookListItem[]> {
    const result = await db
      .select({
        // BookListItem fields
        id: book_list_items.id,
        list_uuid: book_list_items.list_uuid,
        book_uuid: book_list_items.book_uuid,
        user_uuid: book_list_items.user_uuid,
        added_at: book_list_items.added_at,
        sort_order: book_list_items.sort_order,
        personal_rating: book_list_items.personal_rating,
        personal_review: book_list_items.personal_review,
        reading_status: book_list_items.reading_status,
        date_started: book_list_items.date_started,
        date_completed: book_list_items.date_completed,
        progress_percentage: book_list_items.progress_percentage,
        notes: book_list_items.notes,
        // Book fields
        book: {
          id: books.id,
          uuid: books.uuid,
          title: books.title,
          subtitle: books.subtitle,
          author: books.author,
          co_authors: books.co_authors,
          isbn_10: books.isbn_10,
          isbn_13: books.isbn_13,
          genre: books.genre,
          sub_genre: books.sub_genre,
          language: books.language,
          publisher: books.publisher,
          publication_date: books.publication_date,
          page_count: books.page_count,
          word_count: books.word_count,
          description: books.description,
          cover_url: books.cover_url,
          series_name: books.series_name,
          series_number: books.series_number,
          edition: books.edition,
          format: books.format,
          status: books.status,
          metadata: books.metadata,
          goodreads_id: books.goodreads_id,
          google_books_id: books.google_books_id,
          amazon_asin: books.amazon_asin,
          created_at: books.created_at,
          updated_at: books.updated_at,
          created_by: books.created_by
        }
      })
      .from(book_list_items)
      .innerJoin(books, eq(book_list_items.book_uuid, books.uuid))
      .where(eq(book_list_items.user_uuid, userUuid))
      .orderBy(desc(book_list_items.added_at));

    return result.map(row => ({
      ...row,
      book: row.book as Book
    })) as BookListItem[];
  }

  static async searchUserBooks(userUuid: string, query: string): Promise<BookListItem[]> {
    const result = await db
      .select({
        // BookListItem fields
        id: book_list_items.id,
        list_uuid: book_list_items.list_uuid,
        book_uuid: book_list_items.book_uuid,
        user_uuid: book_list_items.user_uuid,
        added_at: book_list_items.added_at,
        sort_order: book_list_items.sort_order,
        personal_rating: book_list_items.personal_rating,
        personal_review: book_list_items.personal_review,
        reading_status: book_list_items.reading_status,
        date_started: book_list_items.date_started,
        date_completed: book_list_items.date_completed,
        progress_percentage: book_list_items.progress_percentage,
        notes: book_list_items.notes,
        // Book fields
        book: {
          id: books.id,
          uuid: books.uuid,
          title: books.title,
          subtitle: books.subtitle,
          author: books.author,
          co_authors: books.co_authors,
          isbn_10: books.isbn_10,
          isbn_13: books.isbn_13,
          genre: books.genre,
          sub_genre: books.sub_genre,
          language: books.language,
          publisher: books.publisher,
          publication_date: books.publication_date,
          page_count: books.page_count,
          word_count: books.word_count,
          description: books.description,
          cover_url: books.cover_url,
          series_name: books.series_name,
          series_number: books.series_number,
          edition: books.edition,
          format: books.format,
          status: books.status,
          metadata: books.metadata,
          goodreads_id: books.goodreads_id,
          google_books_id: books.google_books_id,
          amazon_asin: books.amazon_asin,
          created_at: books.created_at,
          updated_at: books.updated_at,
          created_by: books.created_by
        }
      })
      .from(book_list_items)
      .innerJoin(books, eq(book_list_items.book_uuid, books.uuid))
      .where(
        and(
          eq(book_list_items.user_uuid, userUuid),
          or(
            ilike(books.title, `%${query}%`),
            ilike(books.author, `%${query}%`),
            ilike(books.isbn_10, `%${query}%`),
            ilike(books.isbn_13, `%${query}%`)
          )
        )
      )
      .orderBy(desc(book_list_items.added_at));

    return result.map(row => ({
      ...row,
      book: row.book as Book
    })) as BookListItem[];
  }

  static async addBookToUserLibrary(
    bookUuid: string,
    userUuid: string,
    readingStatus: string = "want_to_read"
  ): Promise<BookListItem> {
    // Get or create default list for user
    let defaultList = await db
      .select()
      .from(book_lists)
      .where(
        and(
          eq(book_lists.user_uuid, userUuid),
          eq(book_lists.is_default, true),
          eq(book_lists.list_type, "custom")
        )
      )
      .limit(1);

    if (defaultList.length === 0) {
      // Create default list
      const listUuid = uuidv4();
      const [newList] = await db.insert(book_lists).values({
        uuid: listUuid,
        user_uuid: userUuid,
        name: "My Library",
        description: "Default book library",
        is_public: false,
        is_default: true,
        list_type: "custom",
        sort_order: 0,
        created_at: new Date(),
        updated_at: new Date()
      }).returning();
      defaultList = [newList];
    }

    // Check if book is already in user's library
    const existing = await db
      .select()
      .from(book_list_items)
      .where(
        and(
          eq(book_list_items.user_uuid, userUuid),
          eq(book_list_items.book_uuid, bookUuid)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      throw new Error("Book already in library");
    }

    // Add book to default list
    const [newItem] = await db.insert(book_list_items).values({
      list_uuid: defaultList[0].uuid,
      book_uuid: bookUuid,
      user_uuid: userUuid,
      reading_status: readingStatus as any,
      progress_percentage: 0,
      sort_order: 0,
      added_at: new Date()
    }).returning();

    // Get full book details
    const bookDetails = await db
      .select()
      .from(books)
      .where(eq(books.uuid, bookUuid))
      .limit(1);

    return {
      ...newItem,
      book: bookDetails[0] as Book
    } as BookListItem;
  }

  // Reading progress operations
  static async updateReadingProgress(
    userUuid: string,
    bookUuid: string,
    progress: Partial<ReadingProgress>
  ): Promise<void> {
    await db
      .update(book_list_items)
      .set({
        progress_percentage: progress.progress_percentage,
        reading_status: progress.reading_status as any,
        date_started: progress.date_started ? new Date(progress.date_started) : undefined,
        date_completed: progress.date_completed ? new Date(progress.date_completed) : undefined
      })
      .where(
        and(
          eq(book_list_items.user_uuid, userUuid),
          eq(book_list_items.book_uuid, bookUuid)
        )
      );
  }

  // Library statistics
  static async getUserLibraryStats(userUuid: string) {
    const stats = await db
      .select({
        status: book_list_items.reading_status,
        count: sql<number>`count(*)`.as('count'),
        avg_rating: sql<number>`avg(${book_list_items.personal_rating})`.as('avg_rating'),
        total_pages: sql<number>`sum(${books.page_count})`.as('total_pages')
      })
      .from(book_list_items)
      .innerJoin(books, eq(book_list_items.book_uuid, books.uuid))
      .where(eq(book_list_items.user_uuid, userUuid))
      .groupBy(book_list_items.reading_status);

    // Get reading session stats for this month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const [sessionStats] = await db
      .select({
        pages_read: sql<number>`sum(${reading_sessions.pages_read})`.as('pages_read'),
        reading_time: sql<number>`sum(${reading_sessions.reading_duration_minutes})`.as('reading_time')
      })
      .from(reading_sessions)
      .where(
        and(
          eq(reading_sessions.user_uuid, userUuid),
          sql`${reading_sessions.session_start} >= ${startOfMonth.toISOString()}`
        )
      );

    // Transform stats into the expected format
    const result = {
      total_books: 0,
      books_read: 0,
      currently_reading: 0,
      want_to_read: 0,
      reading_streak_days: 0, // Will be calculated by ReadingProgressService
      pages_read_this_month: sessionStats.pages_read || 0,
      average_rating: 0,
      total_reading_time_hours: Math.round((sessionStats.reading_time || 0) / 60 * 10) / 10
    };

    stats.forEach(stat => {
      result.total_books += stat.count;
      
      switch (stat.status) {
        case 'read':
          result.books_read = stat.count;
          break;
        case 'currently_reading':
          result.currently_reading = stat.count;
          break;
        case 'want_to_read':
          result.want_to_read = stat.count;
          break;
      }
      
      if (stat.avg_rating) {
        result.average_rating = Number(stat.avg_rating);
      }
    });

    return result;
  }

  // Book lists operations
  static async getUserBookLists(userUuid: string): Promise<BookList[]> {
    const lists = await db
      .select({
        id: book_lists.id,
        uuid: book_lists.uuid,
        user_uuid: book_lists.user_uuid,
        name: book_lists.name,
        description: book_lists.description,
        is_public: book_lists.is_public,
        is_default: book_lists.is_default,
        list_type: book_lists.list_type,
        sort_order: book_lists.sort_order,
        cover_url: book_lists.cover_url,
        tags: book_lists.tags,
        created_at: book_lists.created_at,
        updated_at: book_lists.updated_at,
        book_count: sql<number>`count(${book_list_items.id})`.as('book_count')
      })
      .from(book_lists)
      .leftJoin(book_list_items, eq(book_lists.uuid, book_list_items.list_uuid))
      .where(eq(book_lists.user_uuid, userUuid))
      .groupBy(book_lists.id)
      .orderBy(book_lists.sort_order, book_lists.created_at);

    return lists as BookList[];
  }

  static async createBookList(
    userUuid: string,
    name: string,
    description?: string,
    isPublic: boolean = false
  ): Promise<BookList> {
    const listUuid = uuidv4();
    const now = new Date();

    const [newList] = await db.insert(book_lists).values({
      uuid: listUuid,
      user_uuid: userUuid,
      name,
      description,
      is_public: isPublic,
      is_default: false,
      list_type: "custom",
      sort_order: 0,
      created_at: now,
      updated_at: now
    }).returning();

    return {
      ...newList,
      book_count: 0
    } as BookList;
  }
}