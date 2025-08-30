"use client";

import { useState, useEffect } from "react";
import { BookOpen, Clock, Star, TrendingUp, Plus, MoreHorizontal, Filter } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { BookCover, BookCoverGrid } from "@/components/ui/books/book-cover";
import { Book, BookList, BookListItem } from "@/types/book";

interface LibraryStats {
  total_books: number;
  books_read: number;
  currently_reading: number;
  want_to_read: number;
  reading_streak_days: number;
  pages_read_this_month: number;
  average_rating: number;
  total_reading_time_hours: number;
}

export function LibraryDashboard() {
  const [stats, setStats] = useState<LibraryStats | null>(null);
  const [recentBooks, setRecentBooks] = useState<BookListItem[]>([]);
  const [currentlyReading, setCurrentlyReading] = useState<BookListItem[]>([]);
  const [bookLists, setBookLists] = useState<BookList[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  useEffect(() => {
    loadLibraryData();
  }, []);

  const loadLibraryData = async () => {
    setIsLoading(true);
    
    try {
      // Mock data - replace with actual API calls
      const mockStats: LibraryStats = {
        total_books: 156,
        books_read: 89,
        currently_reading: 3,
        want_to_read: 64,
        reading_streak_days: 12,
        pages_read_this_month: 847,
        average_rating: 4.2,
        total_reading_time_hours: 234
      };

      const mockRecentBooks: BookListItem[] = [
        {
          list_uuid: "recent",
          book_uuid: "book-1",
          user_uuid: "user-1",
          sort_order: 1,
          reading_status: "read",
          progress_percentage: 100,
          personal_rating: 4.5,
          book: {
            uuid: "book-1",
            title: "The Midnight Library",
            author: "Matt Haig",
            cover_url: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=300&h=400&fit=crop",
            genre: "Fiction",
            page_count: 288,
            status: "active",
            language: "en"
          }
        },
        {
          list_uuid: "recent",
          book_uuid: "book-2", 
          user_uuid: "user-1",
          sort_order: 2,
          reading_status: "currently_reading",
          progress_percentage: 65,
          book: {
            uuid: "book-2",
            title: "Project Hail Mary",
            author: "Andy Weir",
            cover_url: "https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=300&h=400&fit=crop",
            genre: "Science Fiction",
            page_count: 496,
            status: "active",
            language: "en"
          }
        },
        {
          list_uuid: "recent",
          book_uuid: "book-3",
          user_uuid: "user-1", 
          sort_order: 3,
          reading_status: "want_to_read",
          progress_percentage: 0,
          book: {
            uuid: "book-3",
            title: "Klara and the Sun",
            author: "Kazuo Ishiguro",
            cover_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=400&fit=crop",
            genre: "Literary Fiction",
            page_count: 320,
            status: "active",
            language: "en"
          }
        }
      ];

      const mockCurrentlyReading: BookListItem[] = mockRecentBooks.filter(
        book => book.reading_status === "currently_reading"
      );

      const mockBookLists: BookList[] = [
        {
          uuid: "favorites",
          user_uuid: "user-1",
          name: "Favorites",
          description: "My all-time favorite books",
          is_public: false,
          is_default: false,
          list_type: "favorites",
          sort_order: 1,
          book_count: 12
        },
        {
          uuid: "sci-fi", 
          user_uuid: "user-1",
          name: "Science Fiction",
          description: "Best sci-fi novels I've read",
          is_public: true,
          is_default: false,
          list_type: "custom",
          sort_order: 2,
          book_count: 28
        }
      ];

      setStats(mockStats);
      setRecentBooks(mockRecentBooks);
      setCurrentlyReading(mockCurrentlyReading);
      setBookLists(mockBookLists);
    } catch (error) {
      console.error("Error loading library data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredBooks = selectedStatus === "all" 
    ? recentBooks 
    : recentBooks.filter(book => book.reading_status === selectedStatus);

  if (isLoading) {
    return <LibraryDashboardSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Books</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_books}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.books_read} read, {stats?.want_to_read} to read
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Currently Reading</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.currently_reading}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.pages_read_this_month} pages this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reading Streak</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.reading_streak_days}</div>
            <p className="text-xs text-muted-foreground">days in a row</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.average_rating}</div>
            <p className="text-xs text-muted-foreground">
              out of 5 stars
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Currently Reading Section */}
      {currentlyReading.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Currently Reading</CardTitle>
            <CardDescription>Books you're actively reading</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {currentlyReading.map((item) => (
                <div key={item.book_uuid} className="flex gap-4 p-4 border rounded-lg">
                  <BookCover
                    src={item.book?.cover_url}
                    alt={item.book?.title || "Book cover"}
                    title={item.book?.title}
                    author={item.book?.author}
                    size="md"
                  />
                  <div className="flex-1 space-y-2">
                    <div>
                      <h4 className="font-semibold">{item.book?.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        by {item.book?.author}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>Progress</span>
                        <span>{item.progress_percentage}%</span>
                      </div>
                      <Progress value={item.progress_percentage} className="h-2" />
                    </div>
                    {item.book?.page_count && (
                      <p className="text-xs text-muted-foreground">
                        ~{Math.round((item.progress_percentage / 100) * item.book.page_count)} / {item.book.page_count} pages
                      </p>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>Update Progress</DropdownMenuItem>
                      <DropdownMenuItem>Add Note</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>Mark as Read</DropdownMenuItem>
                      <DropdownMenuItem>Pause Reading</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Books */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Books</CardTitle>
            <CardDescription>Books you've recently added or updated</CardDescription>
          </div>
          <div className="flex gap-2">
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Books</SelectItem>
                <SelectItem value="currently_reading">Currently Reading</SelectItem>
                <SelectItem value="read">Read</SelectItem>
                <SelectItem value="want_to_read">Want to Read</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
              </SelectContent>
            </Select>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Book
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredBooks.map((item) => (
              <div key={item.book_uuid} className="flex gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                <BookCover
                  src={item.book?.cover_url}
                  alt={item.book?.title || "Book cover"}
                  title={item.book?.title}
                  author={item.book?.author}
                  size="sm"
                />
                <div className="flex-1 space-y-1">
                  <h4 className="font-medium text-sm line-clamp-2">{item.book?.title}</h4>
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {item.book?.author}
                  </p>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={
                        item.reading_status === "read" ? "default" :
                        item.reading_status === "currently_reading" ? "secondary" :
                        "outline"
                      }
                      className="text-xs"
                    >
                      {item.reading_status.replace("_", " ")}
                    </Badge>
                    {item.personal_rating && (
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 fill-current text-yellow-500" />
                        <span className="text-xs">{item.personal_rating}</span>
                      </div>
                    )}
                  </div>
                  {item.reading_status === "currently_reading" && (
                    <Progress value={item.progress_percentage} className="h-1" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Book Lists */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>My Lists</CardTitle>
            <CardDescription>Organize your books into custom collections</CardDescription>
          </div>
          <Button variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Create List
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {bookLists.map((list) => (
              <Card key={list.uuid} className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{list.name}</CardTitle>
                      <CardDescription className="text-sm">
                        {list.book_count} books
                      </CardDescription>
                    </div>
                    {list.is_public && (
                      <Badge variant="secondary" className="text-xs">Public</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {list.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                      {list.description}
                    </p>
                  )}
                  {/* Mock book covers for the list */}
                  <BookCoverGrid
                    books={[
                      { id: "1", title: "Sample Book 1", author: "Author 1" },
                      { id: "2", title: "Sample Book 2", author: "Author 2" },
                      { id: "3", title: "Sample Book 3", author: "Author 3" }
                    ]}
                    size="xs"
                    maxItems={3}
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function LibraryDashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Stats skeleton */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 w-24 bg-muted animate-pulse rounded" />
              <div className="h-4 w-4 bg-muted animate-pulse rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-16 bg-muted animate-pulse rounded mb-2" />
              <div className="h-3 w-32 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent books skeleton */}
      <Card>
        <CardHeader>
          <div className="h-6 w-48 bg-muted animate-pulse rounded" />
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex gap-3">
                <div className="w-16 h-20 bg-muted animate-pulse rounded" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 w-full bg-muted animate-pulse rounded" />
                  <div className="h-3 w-2/3 bg-muted animate-pulse rounded" />
                  <div className="h-2 w-full bg-muted animate-pulse rounded" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}