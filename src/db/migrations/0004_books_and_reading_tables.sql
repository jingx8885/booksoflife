CREATE TABLE "books" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "books_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"uuid" varchar(255) NOT NULL,
	"title" varchar(500) NOT NULL,
	"subtitle" varchar(500),
	"author" varchar(500) NOT NULL,
	"co_authors" text,
	"isbn_10" varchar(10),
	"isbn_13" varchar(13),
	"genre" varchar(100),
	"sub_genre" varchar(100),
	"language" varchar(50) DEFAULT 'en' NOT NULL,
	"publisher" varchar(255),
	"publication_date" timestamp with time zone,
	"page_count" integer,
	"word_count" integer,
	"description" text,
	"cover_url" varchar(500),
	"series_name" varchar(255),
	"series_number" integer,
	"edition" varchar(50),
	"format" varchar(50),
	"status" varchar(50) DEFAULT 'active' NOT NULL,
	"metadata" json,
	"goodreads_id" varchar(50),
	"google_books_id" varchar(50),
	"amazon_asin" varchar(50),
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"created_by" varchar(255),
	CONSTRAINT "books_uuid_unique" UNIQUE("uuid"),
	CONSTRAINT "books_isbn_10_unique" UNIQUE("isbn_10"),
	CONSTRAINT "books_isbn_13_unique" UNIQUE("isbn_13")
);
--> statement-breakpoint
CREATE TABLE "reading_sessions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "reading_sessions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"uuid" varchar(255) NOT NULL,
	"user_uuid" varchar(255) NOT NULL,
	"book_uuid" varchar(255) NOT NULL,
	"session_start" timestamp with time zone NOT NULL,
	"session_end" timestamp with time zone,
	"pages_read" integer DEFAULT 0 NOT NULL,
	"start_page" integer,
	"end_page" integer,
	"reading_duration_minutes" integer,
	"notes" text,
	"mood" varchar(50),
	"location" varchar(100),
	"reading_goal_met" boolean DEFAULT false NOT NULL,
	"status" varchar(50) DEFAULT 'completed' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "reading_sessions_uuid_unique" UNIQUE("uuid")
);
--> statement-breakpoint
CREATE TABLE "reading_notes" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "reading_notes_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"uuid" varchar(255) NOT NULL,
	"user_uuid" varchar(255) NOT NULL,
	"book_uuid" varchar(255) NOT NULL,
	"session_uuid" varchar(255),
	"note_type" varchar(50) NOT NULL,
	"content" text NOT NULL,
	"context" text,
	"page_number" integer,
	"chapter" varchar(255),
	"position_start" integer,
	"position_end" integer,
	"color" varchar(50),
	"is_private" boolean DEFAULT true NOT NULL,
	"is_favorite" boolean DEFAULT false NOT NULL,
	"tags" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "reading_notes_uuid_unique" UNIQUE("uuid")
);
--> statement-breakpoint
CREATE TABLE "book_lists" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "book_lists_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"uuid" varchar(255) NOT NULL,
	"user_uuid" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"is_public" boolean DEFAULT false NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"list_type" varchar(50) DEFAULT 'custom' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"cover_url" varchar(500),
	"tags" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "book_lists_uuid_unique" UNIQUE("uuid")
);
--> statement-breakpoint
CREATE TABLE "book_list_items" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "book_list_items_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"list_uuid" varchar(255) NOT NULL,
	"book_uuid" varchar(255) NOT NULL,
	"user_uuid" varchar(255) NOT NULL,
	"added_at" timestamp with time zone DEFAULT now(),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"personal_rating" numeric(3, 2),
	"personal_review" text,
	"reading_status" varchar(50) DEFAULT 'want_to_read',
	"date_started" timestamp with time zone,
	"date_completed" timestamp with time zone,
	"progress_percentage" integer DEFAULT 0,
	"notes" text
);
--> statement-breakpoint
CREATE INDEX "books_title_idx" ON "books" USING btree ("title");--> statement-breakpoint
CREATE INDEX "books_author_idx" ON "books" USING btree ("author");--> statement-breakpoint
CREATE INDEX "books_isbn_10_idx" ON "books" USING btree ("isbn_10");--> statement-breakpoint
CREATE INDEX "books_isbn_13_idx" ON "books" USING btree ("isbn_13");--> statement-breakpoint
CREATE INDEX "books_genre_idx" ON "books" USING btree ("genre");--> statement-breakpoint
CREATE INDEX "books_series_idx" ON "books" USING btree ("series_name");--> statement-breakpoint
CREATE INDEX "books_created_at_idx" ON "books" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "books_status_idx" ON "books" USING btree ("status");--> statement-breakpoint
CREATE INDEX "books_language_idx" ON "books" USING btree ("language");--> statement-breakpoint
CREATE INDEX "books_format_idx" ON "books" USING btree ("format");--> statement-breakpoint
CREATE INDEX "reading_sessions_user_idx" ON "reading_sessions" USING btree ("user_uuid");--> statement-breakpoint
CREATE INDEX "reading_sessions_book_idx" ON "reading_sessions" USING btree ("book_uuid");--> statement-breakpoint
CREATE INDEX "reading_sessions_date_idx" ON "reading_sessions" USING btree ("session_start");--> statement-breakpoint
CREATE INDEX "reading_sessions_user_book_idx" ON "reading_sessions" USING btree ("user_uuid","book_uuid");--> statement-breakpoint
CREATE INDEX "reading_notes_user_idx" ON "reading_notes" USING btree ("user_uuid");--> statement-breakpoint
CREATE INDEX "reading_notes_book_idx" ON "reading_notes" USING btree ("book_uuid");--> statement-breakpoint
CREATE INDEX "reading_notes_type_idx" ON "reading_notes" USING btree ("note_type");--> statement-breakpoint
CREATE INDEX "reading_notes_user_book_idx" ON "reading_notes" USING btree ("user_uuid","book_uuid");--> statement-breakpoint
CREATE INDEX "reading_notes_page_idx" ON "reading_notes" USING btree ("page_number");--> statement-breakpoint
CREATE INDEX "reading_notes_created_at_idx" ON "reading_notes" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "book_lists_user_idx" ON "book_lists" USING btree ("user_uuid");--> statement-breakpoint
CREATE INDEX "book_lists_type_idx" ON "book_lists" USING btree ("list_type");--> statement-breakpoint
CREATE INDEX "book_lists_public_idx" ON "book_lists" USING btree ("is_public");--> statement-breakpoint
CREATE INDEX "book_lists_created_at_idx" ON "book_lists" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "book_lists_user_default_type" ON "book_lists" USING btree ("user_uuid","list_type","is_default");--> statement-breakpoint
CREATE INDEX "book_list_items_list_idx" ON "book_list_items" USING btree ("list_uuid");--> statement-breakpoint
CREATE INDEX "book_list_items_book_idx" ON "book_list_items" USING btree ("book_uuid");--> statement-breakpoint
CREATE INDEX "book_list_items_user_idx" ON "book_list_items" USING btree ("user_uuid");--> statement-breakpoint
CREATE INDEX "book_list_items_status_idx" ON "book_list_items" USING btree ("reading_status");--> statement-breakpoint
CREATE INDEX "book_list_items_user_status_idx" ON "book_list_items" USING btree ("user_uuid","reading_status");--> statement-breakpoint
CREATE INDEX "book_list_items_added_at_idx" ON "book_list_items" USING btree ("added_at");--> statement-breakpoint
CREATE UNIQUE INDEX "book_list_items_unique" ON "book_list_items" USING btree ("list_uuid","book_uuid");