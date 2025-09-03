import { database as db } from "@/db";
import { reading_sessions, book_list_items, books } from "@/db/schema";
import { ReadingSession, ReadingProgress } from "@/types/book";
import { eq, and, desc, sql, between } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

export class ReadingProgressService {
  // Start a new reading session
  static async startReadingSession(
    userUuid: string,
    bookUuid: string,
    startPage?: number,
    location?: string
  ): Promise<ReadingSession> {
    const sessionUuid = uuidv4();
    const now = new Date();

    const [session] = await db.insert(reading_sessions).values({
      uuid: sessionUuid,
      user_uuid: userUuid,
      book_uuid: bookUuid,
      session_start: now,
      start_page: startPage,
      location,
      pages_read: 0,
      reading_goal_met: false,
      status: "active",
      created_at: now,
      updated_at: now
    }).returning();

    // Update book status to currently_reading if not already
    await this.updateBookReadingStatus(userUuid, bookUuid, "currently_reading");

    return session as ReadingSession;
  }

  // End a reading session
  static async endReadingSession(
    userUuid: string,
    sessionUuid: string,
    endPage?: number,
    notes?: string,
    mood?: string
  ): Promise<ReadingSession> {
    const now = new Date();

    // Get the session to calculate duration and pages read
    const [session] = await db
      .select()
      .from(reading_sessions)
      .where(
        and(
          eq(reading_sessions.uuid, sessionUuid),
          eq(reading_sessions.user_uuid, userUuid)
        )
      )
      .limit(1);

    if (!session) {
      throw new Error("Session not found");
    }

    // Calculate reading duration in minutes
    const durationMs = now.getTime() - new Date(session.session_start).getTime();
    const durationMinutes = Math.round(durationMs / 60000);

    // Calculate pages read
    const pagesRead = endPage && session.start_page 
      ? Math.max(0, endPage - session.start_page + 1)
      : session.pages_read;

    const [updatedSession] = await db
      .update(reading_sessions)
      .set({
        session_end: now,
        end_page: endPage,
        pages_read: pagesRead,
        reading_duration_minutes: durationMinutes,
        notes,
        mood,
        status: "completed",
        updated_at: now
      })
      .where(eq(reading_sessions.uuid, sessionUuid))
      .returning();

    // Update book progress
    await this.updateBookProgress(userUuid, session.book_uuid);

    return updatedSession as ReadingSession;
  }

  // Update book progress based on latest session
  static async updateBookProgress(userUuid: string, bookUuid: string): Promise<void> {
    // Get book details
    const [book] = await db
      .select()
      .from(books)
      .where(eq(books.uuid, bookUuid))
      .limit(1);

    if (!book) return;

    // Get the latest session for this book
    const [latestSession] = await db
      .select()
      .from(reading_sessions)
      .where(
        and(
          eq(reading_sessions.user_uuid, userUuid),
          eq(reading_sessions.book_uuid, bookUuid)
        )
      )
      .orderBy(desc(reading_sessions.session_start))
      .limit(1);

    if (!latestSession || !latestSession.end_page) return;

    // Calculate progress percentage
    const progressPercentage = book.page_count 
      ? Math.min(100, Math.round((latestSession.end_page / book.page_count) * 100))
      : 0;

    // Determine reading status
    let readingStatus = "currently_reading";
    if (progressPercentage >= 100) {
      readingStatus = "read";
    }

    // Update book list item
    await db
      .update(book_list_items)
      .set({
        progress_percentage: progressPercentage,
        reading_status: readingStatus as any,
        date_completed: readingStatus === "read" ? new Date() : undefined
      })
      .where(
        and(
          eq(book_list_items.user_uuid, userUuid),
          eq(book_list_items.book_uuid, bookUuid)
        )
      );
  }

  // Manual progress update
  static async updateManualProgress(
    userUuid: string,
    bookUuid: string,
    currentPage: number,
    totalPages?: number,
    readingStatus?: string
  ): Promise<void> {
    const progressPercentage = totalPages 
      ? Math.min(100, Math.round((currentPage / totalPages) * 100))
      : 0;

    const updateData: any = {
      progress_percentage: progressPercentage
    };

    if (readingStatus) {
      updateData.reading_status = readingStatus;
      
      if (readingStatus === "read") {
        updateData.date_completed = new Date();
      } else if (readingStatus === "currently_reading" && !updateData.date_started) {
        updateData.date_started = new Date();
      }
    }

    await db
      .update(book_list_items)
      .set(updateData)
      .where(
        and(
          eq(book_list_items.user_uuid, userUuid),
          eq(book_list_items.book_uuid, bookUuid)
        )
      );
  }

  // Get reading sessions for a book
  static async getBookReadingSessions(
    userUuid: string,
    bookUuid: string
  ): Promise<ReadingSession[]> {
    const sessions = await db
      .select()
      .from(reading_sessions)
      .where(
        and(
          eq(reading_sessions.user_uuid, userUuid),
          eq(reading_sessions.book_uuid, bookUuid)
        )
      )
      .orderBy(desc(reading_sessions.session_start));

    return sessions as ReadingSession[];
  }

  // Get user's reading statistics
  static async getUserReadingStats(userUuid: string, timeframe: string = "month") {
    let dateFilter;
    const now = new Date();
    
    switch (timeframe) {
      case "week":
        dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "month":
        dateFilter = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case "year":
        dateFilter = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        dateFilter = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    // Get session statistics
    const [sessionStats] = await db
      .select({
        total_sessions: sql<number>`count(*)`,
        total_reading_time: sql<number>`sum(${reading_sessions.reading_duration_minutes})`,
        total_pages_read: sql<number>`sum(${reading_sessions.pages_read})`,
        avg_session_length: sql<number>`avg(${reading_sessions.reading_duration_minutes})`
      })
      .from(reading_sessions)
      .where(
        and(
          eq(reading_sessions.user_uuid, userUuid),
          sql`${reading_sessions.session_start} >= ${dateFilter.toISOString()}`
        )
      );

    // Get reading streak
    const readingStreak = await this.calculateReadingStreak(userUuid);

    return {
      total_sessions: sessionStats.total_sessions || 0,
      total_reading_time_hours: Math.round((sessionStats.total_reading_time || 0) / 60 * 10) / 10,
      total_pages_read: sessionStats.total_pages_read || 0,
      average_session_minutes: Math.round(sessionStats.avg_session_length || 0),
      reading_streak_days: readingStreak,
      timeframe
    };
  }

  // Calculate reading streak
  static async calculateReadingStreak(userUuid: string): Promise<number> {
    // Get distinct reading dates in descending order
    const readingDates = await db
      .select({
        date: sql<string>`DATE(${reading_sessions.session_start})`.as('reading_date')
      })
      .from(reading_sessions)
      .where(eq(reading_sessions.user_uuid, userUuid))
      .groupBy(sql`DATE(${reading_sessions.session_start})`)
      .orderBy(sql`DATE(${reading_sessions.session_start}) DESC`)
      .limit(100); // Limit to avoid performance issues

    if (readingDates.length === 0) return 0;

    let streak = 0;
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    // Start from today or yesterday
    let expectedDate = readingDates[0].date === today ? today : yesterday;
    
    for (const { date } of readingDates) {
      if (date === expectedDate) {
        streak++;
        // Move to previous day
        const prevDay = new Date(expectedDate);
        prevDay.setDate(prevDay.getDate() - 1);
        expectedDate = prevDay.toISOString().split('T')[0];
      } else {
        break;
      }
    }

    return streak;
  }

  // Update book reading status
  private static async updateBookReadingStatus(
    userUuid: string,
    bookUuid: string,
    status: string
  ): Promise<void> {
    const updateData: any = {
      reading_status: status
    };

    if (status === "currently_reading") {
      // Check if date_started is already set
      const [existing] = await db
        .select({ date_started: book_list_items.date_started })
        .from(book_list_items)
        .where(
          and(
            eq(book_list_items.user_uuid, userUuid),
            eq(book_list_items.book_uuid, bookUuid)
          )
        )
        .limit(1);

      if (!existing?.date_started) {
        updateData.date_started = new Date();
      }
    }

    await db
      .update(book_list_items)
      .set(updateData)
      .where(
        and(
          eq(book_list_items.user_uuid, userUuid),
          eq(book_list_items.book_uuid, bookUuid)
        )
      );
  }

  // Get active reading session
  static async getActiveSession(userUuid: string, bookUuid: string): Promise<ReadingSession | null> {
    const [session] = await db
      .select()
      .from(reading_sessions)
      .where(
        and(
          eq(reading_sessions.user_uuid, userUuid),
          eq(reading_sessions.book_uuid, bookUuid),
          eq(reading_sessions.status, "active")
        )
      )
      .orderBy(desc(reading_sessions.session_start))
      .limit(1);

    return session as ReadingSession || null;
  }

  // Update session progress (for active sessions)
  static async updateSessionProgress(
    sessionUuid: string,
    currentPage: number,
    notes?: string
  ): Promise<void> {
    const [session] = await db
      .select()
      .from(reading_sessions)
      .where(eq(reading_sessions.uuid, sessionUuid))
      .limit(1);

    if (!session) {
      throw new Error("Session not found");
    }

    const pagesRead = session.start_page 
      ? Math.max(0, currentPage - session.start_page + 1)
      : currentPage;

    await db
      .update(reading_sessions)
      .set({
        end_page: currentPage,
        pages_read: pagesRead,
        notes,
        updated_at: new Date()
      })
      .where(eq(reading_sessions.uuid, sessionUuid));
  }
}