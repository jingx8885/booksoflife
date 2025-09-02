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
import { BookCover } from "@/components/ui/books/book-cover";
import { Book, BookList, BookListItem } from "@/types/book";
import { useTranslations } from "next-intl";

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
  const t = useTranslations('dashboard');
  const tFilters = useTranslations('filters');
  const tStatus = useTranslations('reading_status');
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
            <CardTitle className="text-sm font-medium">{t('stats_cards.total_books')}</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_books}</div>
            <p className="text-xs text-muted-foreground">
              {t('stats_cards.read_to_read', {read: stats?.books_read || 0, toRead: stats?.want_to_read || 0})}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('stats_cards.currently_reading')}</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.currently_reading}</div>
            <p className="text-xs text-muted-foreground">
              {t('stats_cards.pages_this_month', {pages: stats?.pages_read_this_month || 0})}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('stats_cards.reading_streak')}</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.reading_streak_days}</div>
            <p className="text-xs text-muted-foreground">{t('stats_cards.days_in_row')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('stats_cards.average_rating')}</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.average_rating}</div>
            <p className="text-xs text-muted-foreground">
              {t('stats_cards.out_of_stars')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Currently Reading Section */}
      {currentlyReading.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('currently_reading_section.title')}</CardTitle>
            <CardDescription>{t('currently_reading_section.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {currentlyReading.map((item) => (
                <Card key={item.book_uuid} className="group hover:shadow-md transition-all duration-200">
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      <BookCover
                        src={item.book?.cover_url}
                        alt={item.book?.title || "Book cover"}
                        title={item.book?.title}
                        author={item.book?.author}
                        size="md"
                        className="shrink-0"
                      />
                      <div className="flex-1 space-y-3 min-w-0">
                        <div>
                          <h4 className="font-semibold text-base group-hover:text-primary transition-colors line-clamp-2">
                            {item.book?.title}
                          </h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            {item.book?.author}
                          </p>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="font-medium">{t('currently_reading_section.progress')}</span>
                            <span className="font-semibold text-primary">{item.progress_percentage}%</span>
                          </div>
                          <Progress value={item.progress_percentage} className="h-2.5" />
                          {item.book?.page_count && (
                            <p className="text-xs text-muted-foreground">
                              {t('currently_reading_section.pages_format', {
                                current: Math.round((item.progress_percentage / 100) * item.book.page_count),
                                total: item.book.page_count
                              })}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="shrink-0">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>{t('currently_reading_section.actions.update_progress')}</DropdownMenuItem>
                            <DropdownMenuItem>{t('currently_reading_section.actions.add_note')}</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>{t('currently_reading_section.actions.mark_as_read')}</DropdownMenuItem>
                            <DropdownMenuItem>{t('currently_reading_section.actions.pause_reading')}</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Books */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{t('recent_books_section.title')}</CardTitle>
            <CardDescription>{t('recent_books_section.description')}</CardDescription>
          </div>
          <div className="flex gap-2">
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t('recent_books_section.filter_placeholder')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{tFilters('all')}</SelectItem>
                <SelectItem value="currently_reading">{tStatus('currently_reading')}</SelectItem>
                <SelectItem value="read">{tStatus('completed')}</SelectItem>
                <SelectItem value="want_to_read">{tStatus('want_to_read')}</SelectItem>
                <SelectItem value="paused">{tStatus('on_hold')}</SelectItem>
              </SelectContent>
            </Select>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              {t('recent_books_section.add_book')}
            </Button>
          </div>
        </CardHeader>
                <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredBooks.map((item) => (
              <Card key={item.book_uuid} className="group hover:shadow-md transition-all duration-200 cursor-pointer border hover:border-primary/20">
                <CardContent className="p-4">
                  <div className="flex gap-3">
                    <BookCover
                      src={item.book?.cover_url}
                      alt={item.book?.title || "Book cover"}
                      title={item.book?.title}
                      author={item.book?.author}
                      size="sm"
                      className="shrink-0"
                    />
                    <div className="flex-1 space-y-2 min-w-0">
                      <div>
                        <h4 className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">
                          {item.book?.title}
                        </h4>
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
                          {item.book?.author}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge 
                          variant={
                            item.reading_status === "read" ? "default" :
                            item.reading_status === "currently_reading" ? "secondary" :
                            "outline"
                          }
                          className="text-xs"
                        >
                          {item.reading_status === "read" ? tStatus('completed') :
                           item.reading_status === "currently_reading" ? tStatus('currently_reading') :
                           item.reading_status === "want_to_read" ? tStatus('want_to_read') :
                           tStatus('on_hold')}
                        </Badge>
                        {item.personal_rating && (
                          <div className="flex items-center gap-1">
                            <Star className="h-3 w-3 fill-current text-yellow-500" />
                            <span className="text-xs font-medium">{item.personal_rating}</span>
                          </div>
                        )}
                      </div>
                      
                      {item.reading_status === "currently_reading" && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{t('currently_reading_section.progress')}</span>
                            <span>{item.progress_percentage}%</span>
                          </div>
                          <Progress value={item.progress_percentage} className="h-1.5" />
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Book Lists */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{t('book_lists_section.title')}</CardTitle>
            <CardDescription>{t('book_lists_section.description')}</CardDescription>
          </div>
          <Button variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            {t('book_lists_section.create_list')}
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {bookLists.map((list) => (
              <Card key={list.uuid} className="group hover:shadow-lg transition-all duration-200 cursor-pointer border-2 hover:border-primary/20">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg font-semibold group-hover:text-primary transition-colors line-clamp-1">
                        {list.name}
                      </CardTitle>
                      <CardDescription className="text-sm text-muted-foreground mt-1">
                        {t('book_lists_section.books_count', {count: list.book_count || 0})}
                      </CardDescription>
                    </div>
                    {list.is_public && (
                      <Badge variant="secondary" className="text-xs shrink-0">
                        {t('book_lists_section.public_badge')}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-4">
                  {list.description && (
                    <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                      {list.description}
                    </p>
                  )}
                  {/* 简化的书籍预览 */}
                  <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                    <div className="flex -space-x-2">
                      {[1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className="w-8 h-10 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-800 rounded border-2 border-background shadow-sm"
                          style={{
                            background: `linear-gradient(135deg, hsl(${200 + i * 30}, 60%, 85%) 0%, hsl(${200 + i * 30}, 60%, 75%) 100%)`
                          }}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground ml-2">
                      {(list.book_count || 0) > 3 ? `+${(list.book_count || 0) - 3} more` : ''}
                    </span>
                  </div>
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