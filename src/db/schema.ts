import {
  pgTable,
  serial,
  varchar,
  text,
  boolean,
  integer,
  timestamp,
  unique,
  uniqueIndex,
  index,
  decimal,
  json,
} from "drizzle-orm/pg-core";

// Users table
export const users = pgTable(
  "users",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    uuid: varchar({ length: 255 }).notNull().unique(),
    email: varchar({ length: 255 }).notNull(),
    created_at: timestamp({ withTimezone: true }),
    nickname: varchar({ length: 255 }),
    avatar_url: varchar({ length: 255 }),
    locale: varchar({ length: 50 }),
    signin_type: varchar({ length: 50 }),
    signin_ip: varchar({ length: 255 }),
    signin_provider: varchar({ length: 50 }),
    signin_openid: varchar({ length: 255 }),
    invite_code: varchar({ length: 255 }).notNull().default(""),
    updated_at: timestamp({ withTimezone: true }),
    invited_by: varchar({ length: 255 }).notNull().default(""),
    is_affiliate: boolean().notNull().default(false),
  },
  (table) => [
    uniqueIndex("email_provider_unique_idx").on(
      table.email,
      table.signin_provider
    ),
  ]
);

// Orders table
export const orders = pgTable("orders", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  order_no: varchar({ length: 255 }).notNull().unique(),
  created_at: timestamp({ withTimezone: true }),
  user_uuid: varchar({ length: 255 }).notNull().default(""),
  user_email: varchar({ length: 255 }).notNull().default(""),
  amount: integer().notNull(),
  interval: varchar({ length: 50 }),
  expired_at: timestamp({ withTimezone: true }),
  status: varchar({ length: 50 }).notNull(),
  stripe_session_id: varchar({ length: 255 }),
  credits: integer().notNull(),
  currency: varchar({ length: 50 }),
  sub_id: varchar({ length: 255 }),
  sub_interval_count: integer(),
  sub_cycle_anchor: integer(),
  sub_period_end: integer(),
  sub_period_start: integer(),
  sub_times: integer(),
  product_id: varchar({ length: 255 }),
  product_name: varchar({ length: 255 }),
  valid_months: integer(),
  order_detail: text(),
  paid_at: timestamp({ withTimezone: true }),
  paid_email: varchar({ length: 255 }),
  paid_detail: text(),
});

// API Keys table
export const apikeys = pgTable("apikeys", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  api_key: varchar({ length: 255 }).notNull().unique(),
  title: varchar({ length: 100 }),
  user_uuid: varchar({ length: 255 }).notNull(),
  created_at: timestamp({ withTimezone: true }),
  status: varchar({ length: 50 }),
});

// Credits table
export const credits = pgTable("credits", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  trans_no: varchar({ length: 255 }).notNull().unique(),
  created_at: timestamp({ withTimezone: true }),
  user_uuid: varchar({ length: 255 }).notNull(),
  trans_type: varchar({ length: 50 }).notNull(),
  credits: integer().notNull(),
  order_no: varchar({ length: 255 }),
  expired_at: timestamp({ withTimezone: true }),
});

// Categories table
export const categories = pgTable("categories", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  uuid: varchar({ length: 255 }).notNull().unique(),
  name: varchar({ length: 255 }).notNull().unique(),
  title: varchar({ length: 255 }).notNull(),
  description: text(),
  status: varchar({ length: 50 }),
  sort: integer().notNull().default(0),
  created_at: timestamp({ withTimezone: true }),
  updated_at: timestamp({ withTimezone: true }),
});

// Posts table
export const posts = pgTable("posts", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  uuid: varchar({ length: 255 }).notNull().unique(),
  slug: varchar({ length: 255 }),
  title: varchar({ length: 255 }),
  description: text(),
  content: text(),
  created_at: timestamp({ withTimezone: true }),
  updated_at: timestamp({ withTimezone: true }),
  status: varchar({ length: 50 }),
  cover_url: varchar({ length: 255 }),
  author_name: varchar({ length: 255 }),
  author_avatar_url: varchar({ length: 255 }),
  locale: varchar({ length: 50 }),
  category_uuid: varchar({ length: 255 }),
});

// Affiliates table
export const affiliates = pgTable("affiliates", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  user_uuid: varchar({ length: 255 }).notNull(),
  created_at: timestamp({ withTimezone: true }),
  status: varchar({ length: 50 }).notNull().default(""),
  invited_by: varchar({ length: 255 }).notNull(),
  paid_order_no: varchar({ length: 255 }).notNull().default(""),
  paid_amount: integer().notNull().default(0),
  reward_percent: integer().notNull().default(0),
  reward_amount: integer().notNull().default(0),
});

// Feedbacks table
export const feedbacks = pgTable("feedbacks", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  created_at: timestamp({ withTimezone: true }),
  status: varchar({ length: 50 }),
  user_uuid: varchar({ length: 255 }),
  content: text(),
  rating: integer(),
});

// Books table - Core book metadata and information
export const books = pgTable(
  "books",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    uuid: varchar({ length: 255 }).notNull().unique(),
    title: varchar({ length: 500 }).notNull(),
    subtitle: varchar({ length: 500 }),
    author: varchar({ length: 500 }).notNull(),
    co_authors: text(), // JSON array of additional authors
    isbn_10: varchar({ length: 10 }),
    isbn_13: varchar({ length: 13 }),
    genre: varchar({ length: 100 }),
    sub_genre: varchar({ length: 100 }),
    language: varchar({ length: 50 }).notNull().default("en"),
    publisher: varchar({ length: 255 }),
    publication_date: timestamp({ withTimezone: true }),
    page_count: integer(),
    word_count: integer(),
    description: text(),
    cover_url: varchar({ length: 500 }),
    series_name: varchar({ length: 255 }),
    series_number: integer(),
    edition: varchar({ length: 50 }),
    format: varchar({ length: 50 }), // physical, ebook, audiobook, etc.
    status: varchar({ length: 50 }).notNull().default("active"), // active, archived, deleted
    metadata: json(), // Flexible JSON field for additional book-specific data
    goodreads_id: varchar({ length: 50 }),
    google_books_id: varchar({ length: 50 }),
    amazon_asin: varchar({ length: 50 }),
    created_at: timestamp({ withTimezone: true }).defaultNow(),
    updated_at: timestamp({ withTimezone: true }).defaultNow(),
    created_by: varchar({ length: 255 }), // user_uuid who added the book
  },
  (table) => [
    index("books_title_idx").on(table.title),
    index("books_author_idx").on(table.author),
    index("books_isbn_10_idx").on(table.isbn_10),
    index("books_isbn_13_idx").on(table.isbn_13),
    index("books_genre_idx").on(table.genre),
    index("books_series_idx").on(table.series_name),
    index("books_created_at_idx").on(table.created_at),
    index("books_status_idx").on(table.status),
    index("books_language_idx").on(table.language),
    index("books_format_idx").on(table.format),
    uniqueIndex("books_isbn_10_unique").on(table.isbn_10),
    uniqueIndex("books_isbn_13_unique").on(table.isbn_13),
  ]
);

// Reading Sessions table - Track user reading progress
export const reading_sessions = pgTable(
  "reading_sessions",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    uuid: varchar({ length: 255 }).notNull().unique(),
    user_uuid: varchar({ length: 255 }).notNull(),
    book_uuid: varchar({ length: 255 }).notNull(),
    session_start: timestamp({ withTimezone: true }).notNull(),
    session_end: timestamp({ withTimezone: true }),
    pages_read: integer().notNull().default(0),
    start_page: integer(),
    end_page: integer(),
    reading_duration_minutes: integer(), // Calculated field
    notes: text(),
    mood: varchar({ length: 50 }), // happy, focused, tired, etc.
    location: varchar({ length: 100 }), // home, library, commute, etc.
    reading_goal_met: boolean().notNull().default(false),
    status: varchar({ length: 50 }).notNull().default("completed"), // active, paused, completed
    created_at: timestamp({ withTimezone: true }).defaultNow(),
    updated_at: timestamp({ withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("reading_sessions_user_idx").on(table.user_uuid),
    index("reading_sessions_book_idx").on(table.book_uuid),
    index("reading_sessions_date_idx").on(table.session_start),
    index("reading_sessions_user_book_idx").on(table.user_uuid, table.book_uuid),
  ]
);

// Reading Notes table - User annotations, highlights, and notes
export const reading_notes = pgTable(
  "reading_notes",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    uuid: varchar({ length: 255 }).notNull().unique(),
    user_uuid: varchar({ length: 255 }).notNull(),
    book_uuid: varchar({ length: 255 }).notNull(),
    session_uuid: varchar({ length: 255 }), // Optional link to specific reading session
    note_type: varchar({ length: 50 }).notNull(), // highlight, note, bookmark, quote
    content: text().notNull(), // The actual note/highlight content
    context: text(), // Surrounding text for highlights
    page_number: integer(),
    chapter: varchar({ length: 255 }),
    position_start: integer(), // Character position for ebooks
    position_end: integer(),
    color: varchar({ length: 50 }), // For highlight colors
    is_private: boolean().notNull().default(true),
    is_favorite: boolean().notNull().default(false),
    tags: text(), // JSON array of user-defined tags
    created_at: timestamp({ withTimezone: true }).defaultNow(),
    updated_at: timestamp({ withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("reading_notes_user_idx").on(table.user_uuid),
    index("reading_notes_book_idx").on(table.book_uuid),
    index("reading_notes_type_idx").on(table.note_type),
    index("reading_notes_user_book_idx").on(table.user_uuid, table.book_uuid),
    index("reading_notes_page_idx").on(table.page_number),
    index("reading_notes_created_at_idx").on(table.created_at),
  ]
);

// Book Lists table - Custom book collections and reading lists
export const book_lists = pgTable(
  "book_lists",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    uuid: varchar({ length: 255 }).notNull().unique(),
    user_uuid: varchar({ length: 255 }).notNull(),
    name: varchar({ length: 255 }).notNull(),
    description: text(),
    is_public: boolean().notNull().default(false),
    is_default: boolean().notNull().default(false), // For system lists like "Want to Read", "Currently Reading"
    list_type: varchar({ length: 50 }).notNull().default("custom"), // custom, want_to_read, currently_reading, completed, favorites
    sort_order: integer().notNull().default(0),
    cover_url: varchar({ length: 500 }),
    tags: text(), // JSON array of tags
    created_at: timestamp({ withTimezone: true }).defaultNow(),
    updated_at: timestamp({ withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("book_lists_user_idx").on(table.user_uuid),
    index("book_lists_type_idx").on(table.list_type),
    index("book_lists_public_idx").on(table.is_public),
    index("book_lists_created_at_idx").on(table.created_at),
    uniqueIndex("book_lists_user_default_type").on(table.user_uuid, table.list_type, table.is_default),
  ]
);

// Book List Items table - Junction table for books in lists
export const book_list_items = pgTable(
  "book_list_items",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    list_uuid: varchar({ length: 255 }).notNull(),
    book_uuid: varchar({ length: 255 }).notNull(),
    user_uuid: varchar({ length: 255 }).notNull(), // For performance and data integrity
    added_at: timestamp({ withTimezone: true }).defaultNow(),
    sort_order: integer().notNull().default(0),
    personal_rating: decimal({ precision: 3, scale: 2 }), // 0.00 to 5.00
    personal_review: text(),
    reading_status: varchar({ length: 50 }).default("want_to_read"), // want_to_read, reading, completed, dnf (did not finish)
    date_started: timestamp({ withTimezone: true }),
    date_completed: timestamp({ withTimezone: true }),
    progress_percentage: integer().default(0), // 0-100
    notes: text(),
  },
  (table) => [
    index("book_list_items_list_idx").on(table.list_uuid),
    index("book_list_items_book_idx").on(table.book_uuid),
    index("book_list_items_user_idx").on(table.user_uuid),
    index("book_list_items_status_idx").on(table.reading_status),
    index("book_list_items_user_status_idx").on(table.user_uuid, table.reading_status),
    index("book_list_items_added_at_idx").on(table.added_at),
    uniqueIndex("book_list_items_unique").on(table.list_uuid, table.book_uuid),
  ]
);
