export interface Book {
  id?: number;
  uuid: string;
  title: string;
  subtitle?: string;
  author: string;
  co_authors?: string;
  isbn_10?: string;
  isbn_13?: string;
  genre?: string;
  sub_genre?: string;
  language: string;
  publisher?: string;
  publication_date?: string;
  page_count?: number;
  word_count?: number;
  description?: string;
  cover_url?: string;
  series_name?: string;
  series_number?: number;
  edition?: string;
  format?: string;
  status: string;
  metadata?: Record<string, any>;
  goodreads_id?: string;
  google_books_id?: string;
  amazon_asin?: string;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
}

export interface BookSearchResult {
  books: Book[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}

export interface BookSearchFilters {
  query?: string;
  author?: string;
  genre?: string;
  language?: string;
  format?: string;
  status?: string;
}

export interface ReadingSession {
  id?: number;
  uuid: string;
  user_uuid: string;
  book_uuid: string;
  session_start: string;
  session_end?: string;
  pages_read: number;
  start_page?: number;
  end_page?: number;
  reading_duration_minutes?: number;
  notes?: string;
  mood?: string;
  location?: string;
  reading_goal_met: boolean;
  status: string;
  created_at?: string;
  updated_at?: string;
}

export interface ReadingNote {
  id?: number;
  uuid: string;
  user_uuid: string;
  book_uuid: string;
  session_uuid?: string;
  note_type: 'highlight' | 'note' | 'bookmark' | 'quote';
  content: string;
  context?: string;
  page_number?: number;
  chapter?: string;
  position_start?: number;
  position_end?: number;
  color?: string;
  is_private: boolean;
  is_favorite: boolean;
  tags?: string;
  created_at?: string;
  updated_at?: string;
}

export interface BookList {
  id?: number;
  uuid: string;
  user_uuid: string;
  name: string;
  description?: string;
  is_public: boolean;
  is_default: boolean;
  list_type: 'custom' | 'want_to_read' | 'currently_reading' | 'read' | 'favorites';
  sort_order: number;
  cover_url?: string;
  tags?: string;
  created_at?: string;
  updated_at?: string;
  items?: BookListItem[];
  book_count?: number;
}

export interface BookListItem {
  id?: number;
  list_uuid: string;
  book_uuid: string;
  user_uuid: string;
  added_at?: string;
  sort_order: number;
  personal_rating?: number;
  personal_review?: string;
  reading_status: 'want_to_read' | 'currently_reading' | 'read' | 'paused' | 'abandoned';
  date_started?: string;
  date_completed?: string;
  progress_percentage: number;
  notes?: string;
  book?: Book;
}

export interface ReadingProgress {
  book_uuid: string;
  current_page: number;
  total_pages: number;
  progress_percentage: number;
  reading_status: 'want_to_read' | 'currently_reading' | 'read' | 'paused' | 'abandoned';
  date_started?: string;
  date_completed?: string;
  total_reading_time_minutes?: number;
  sessions_count?: number;
  last_session_date?: string;
}

export interface BookFormData {
  title: string;
  subtitle?: string;
  author: string;
  co_authors?: string;
  isbn_10?: string;
  isbn_13?: string;
  genre?: string;
  sub_genre?: string;
  language: string;
  publisher?: string;
  publication_date?: string;
  page_count?: number;
  description?: string;
  cover_url?: string;
  series_name?: string;
  series_number?: number;
  edition?: string;
  format?: string;
}

export interface ExternalBookResult {
  id: string;
  title: string;
  subtitle?: string;
  authors: string[];
  description?: string;
  published_date?: string;
  page_count?: number;
  categories?: string[];
  language?: string;
  isbn_10?: string;
  isbn_13?: string;
  image_links?: {
    thumbnail?: string;
    small?: string;
    medium?: string;
    large?: string;
  };
  publisher?: string;
  source: 'google_books' | 'open_library';
}