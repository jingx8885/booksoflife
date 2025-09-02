"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { CalendarIcon, ImageIcon, Loader2, Search, X } from "lucide-react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { BookCover } from "@/components/ui/books/book-cover";
import { BookSearch } from "@/components/books/book-search";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { BookFormData, ExternalBookResult, Book } from "@/types/book";

const bookFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  subtitle: z.string().optional(),
  author: z.string().min(1, "Author is required"),
  co_authors: z.string().optional(),
  isbn_10: z.string().regex(/^\d{10}$/, "ISBN-10 must be 10 digits").optional().or(z.literal("")),
  isbn_13: z.string().regex(/^\d{13}$/, "ISBN-13 must be 13 digits").optional().or(z.literal("")),
  genre: z.string().optional(),
  sub_genre: z.string().optional(),
  language: z.string().min(1, "Language is required"),
  publisher: z.string().optional(),
  publication_date: z.date().optional(),
  page_count: z.number().min(1).optional(),
  description: z.string().optional(),
  cover_url: z.string().url().optional().or(z.literal("")),
  series_name: z.string().optional(),
  series_number: z.number().min(1).optional(),
  edition: z.string().optional(),
  format: z.string().optional(),
});

type BookFormValues = z.infer<typeof bookFormSchema>;

interface BookFormProps {
  book?: Book;
  onSubmit: (data: BookFormData) => void;
  onCancel?: () => void;
  isLoading?: boolean;
  className?: string;
}

export function BookForm({ book, onSubmit, onCancel, isLoading = false, className }: BookFormProps) {
  const [showSearch, setShowSearch] = useState(false);
  const [previewImage, setPreviewImage] = useState(book?.cover_url || "");

  const form = useForm<BookFormValues>({
    resolver: zodResolver(bookFormSchema),
    defaultValues: {
      title: book?.title || "",
      subtitle: book?.subtitle || "",
      author: book?.author || "",
      co_authors: book?.co_authors || "",
      isbn_10: book?.isbn_10 || "",
      isbn_13: book?.isbn_13 || "",
      genre: book?.genre || "",
      sub_genre: book?.sub_genre || "",
      language: book?.language || "en",
      publisher: book?.publisher || "",
      publication_date: book?.publication_date ? new Date(book.publication_date) : undefined,
      page_count: book?.page_count || undefined,
      description: book?.description || "",
      cover_url: book?.cover_url || "",
      series_name: book?.series_name || "",
      series_number: book?.series_number || undefined,
      edition: book?.edition || "",
      format: book?.format || "paperback",
    },
  });

  const handleSubmit = (values: BookFormValues) => {
    const formData: BookFormData = {
      ...values,
      isbn_10: values.isbn_10 || undefined,
      isbn_13: values.isbn_13 || undefined,
      cover_url: values.cover_url || undefined,
      publication_date: values.publication_date?.toISOString(),
    };
    onSubmit(formData);
  };

  const handleExternalBookSelect = (externalBook: ExternalBookResult) => {
    form.setValue("title", externalBook.title);
    form.setValue("subtitle", externalBook.subtitle || "");
    form.setValue("author", externalBook.authors.join(", "));
    form.setValue("isbn_10", externalBook.isbn_10 || "");
    form.setValue("isbn_13", externalBook.isbn_13 || "");
    form.setValue("genre", externalBook.categories?.[0] || "");
    form.setValue("language", externalBook.language || "en");
    form.setValue("publisher", externalBook.publisher || "");
    form.setValue("page_count", externalBook.page_count || undefined);
    form.setValue("description", externalBook.description || "");
    form.setValue("cover_url", externalBook.image_links?.thumbnail || "");
    
    if (externalBook.published_date) {
      form.setValue("publication_date", new Date(externalBook.published_date));
    }

    setPreviewImage(externalBook.image_links?.thumbnail || "");
    setShowSearch(false);
  };

  const watchedCoverUrl = form.watch("cover_url");
  
  return (
    <div className={cn("space-y-6", className)}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{book ? "Edit Book" : "Add New Book"}</h2>
          <p className="text-muted-foreground">
            {book ? "Update book information" : "Add a book to your library"}
          </p>
        </div>
        <Dialog open={showSearch} onOpenChange={setShowSearch}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <Search className="h-4 w-4 mr-2" />
              Search Books
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Search for Books</DialogTitle>
              <DialogDescription>
                Find books from external sources and auto-fill the form
              </DialogDescription>
            </DialogHeader>
            <BookSearch 
              onBookSelect={handleExternalBookSelect}
              autoFocus
            />
          </DialogContent>
        </Dialog>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Book Cover Preview */}
            <div className="space-y-4">
              <Label>Book Cover</Label>
              <div className="flex flex-col items-center space-y-4">
                <BookCover
                  src={watchedCoverUrl || previewImage}
                  alt="Book cover preview"
                  title={form.watch("title")}
                  author={form.watch("author")}
                  size="lg"
                />
                <FormField
                  control={form.control}
                  name="cover_url"
                  render={({ field }) => (
                    <FormItem className="w-full">
                      <FormControl>
                        <Input
                          placeholder="Cover image URL"
                          {...field}
                          onChange={(e) => {
                            field.onChange(e);
                            setPreviewImage(e.target.value);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Form Fields */}
            <div className="lg:col-span-2 space-y-6">
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="basic">Basic Info</TabsTrigger>
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="metadata">Metadata</TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Title *</FormLabel>
                          <FormControl>
                            <Input placeholder="Book title" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="subtitle"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Subtitle</FormLabel>
                          <FormControl>
                            <Input placeholder="Book subtitle (optional)" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="author"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Author *</FormLabel>
                          <FormControl>
                            <Input placeholder="Primary author" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="co_authors"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Co-authors</FormLabel>
                          <FormControl>
                            <Input placeholder="Additional authors" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="genre"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Genre</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select genre" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="fiction">Fiction</SelectItem>
                              <SelectItem value="non-fiction">Non-fiction</SelectItem>
                              <SelectItem value="mystery">Mystery</SelectItem>
                              <SelectItem value="science-fiction">Science Fiction</SelectItem>
                              <SelectItem value="fantasy">Fantasy</SelectItem>
                              <SelectItem value="romance">Romance</SelectItem>
                              <SelectItem value="thriller">Thriller</SelectItem>
                              <SelectItem value="horror">Horror</SelectItem>
                              <SelectItem value="biography">Biography</SelectItem>
                              <SelectItem value="history">History</SelectItem>
                              <SelectItem value="self-help">Self Help</SelectItem>
                              <SelectItem value="business">Business</SelectItem>
                              <SelectItem value="technology">Technology</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="language"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Language *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select language" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="en">English</SelectItem>
                              <SelectItem value="es">Spanish</SelectItem>
                              <SelectItem value="fr">French</SelectItem>
                              <SelectItem value="de">German</SelectItem>
                              <SelectItem value="it">Italian</SelectItem>
                              <SelectItem value="pt">Portuguese</SelectItem>
                              <SelectItem value="ru">Russian</SelectItem>
                              <SelectItem value="zh">Chinese</SelectItem>
                              <SelectItem value="ja">Japanese</SelectItem>
                              <SelectItem value="ko">Korean</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Book description or summary"
                            className="min-h-[100px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>

                <TabsContent value="details" className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="publisher"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Publisher</FormLabel>
                          <FormControl>
                            <Input placeholder="Publishing company" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="publication_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Publication Date</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  {field.value ? (
                                    format(field.value, "PPP")
                                  ) : (
                                    <span>Pick a date</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) =>
                                  date > new Date() || date < new Date("1900-01-01")
                                }
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="page_count"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Page Count</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              placeholder="Number of pages"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="format"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Format</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Book format" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="hardcover">Hardcover</SelectItem>
                              <SelectItem value="paperback">Paperback</SelectItem>
                              <SelectItem value="ebook">E-book</SelectItem>
                              <SelectItem value="audiobook">Audiobook</SelectItem>
                              <SelectItem value="mass-market">Mass Market</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="series_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Series Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Book series (if applicable)" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="series_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Series Number</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              placeholder="Book number in series"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="metadata" className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="isbn_10"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ISBN-10</FormLabel>
                          <FormControl>
                            <Input placeholder="10-digit ISBN" {...field} />
                          </FormControl>
                          <FormDescription>
                            10-digit International Standard Book Number
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="isbn_13"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ISBN-13</FormLabel>
                          <FormControl>
                            <Input placeholder="13-digit ISBN" {...field} />
                          </FormControl>
                          <FormDescription>
                            13-digit International Standard Book Number
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="sub_genre"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Sub-genre</FormLabel>
                          <FormControl>
                            <Input placeholder="More specific genre" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="edition"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Edition</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., 1st, 2nd, Revised" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-4 pt-6 border-t">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {book ? "Update Book" : "Add Book"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}