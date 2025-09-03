"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { BookFormData } from "@/types/book";

const bookFormSchema = z.object({
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
  page_count: z.coerce.number().int().positive().optional(),
  description: z.string().optional(),
  cover_url: z.string().url().optional().or(z.literal("")),
  series_name: z.string().optional(),
  series_number: z.coerce.number().int().positive().optional(),
  edition: z.string().optional(),
  format: z.string().optional(),
  reading_status: z.enum(['want_to_read', 'currently_reading', 'read']).default('want_to_read')
});

type BookFormValues = z.infer<typeof bookFormSchema>;

interface AddBookFormProps {
  onBookAdded?: () => void;
}

export function AddBookForm({ onBookAdded }: AddBookFormProps) {
  const t = useTranslations('book_form');
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<BookFormValues>({
    resolver: zodResolver(bookFormSchema),
    defaultValues: {
      title: "",
      subtitle: "",
      author: "",
      co_authors: "",
      isbn_10: "",
      isbn_13: "",
      genre: "",
      sub_genre: "",
      language: "en",
      publisher: "",
      publication_date: "",
      page_count: undefined,
      description: "",
      cover_url: "",
      series_name: "",
      series_number: undefined,
      edition: "",
      format: "paperback",
      reading_status: "want_to_read"
    }
  });

  const onSubmit = async (values: BookFormValues) => {
    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/books', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add book');
      }

      const { book } = await response.json();
      
      toast.success('Book added successfully!');
      form.reset();
      setIsOpen(false);
      
      // Notify parent component to refresh data
      if (onBookAdded) {
        onBookAdded();
      }
    } catch (error) {
      console.error('Error adding book:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to add book');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Book
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Book</DialogTitle>
          <DialogDescription>
            Add a book from your personal collection to track your reading progress.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Basic Information</h3>
              
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter book title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="subtitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subtitle</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter subtitle (optional)" {...field} />
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
                      <Input placeholder="Enter author name" {...field} />
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
                    <FormLabel>Co-Authors</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter co-authors (comma separated)" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Publication Details */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Publication Details</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="isbn_10"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ISBN-10</FormLabel>
                      <FormControl>
                        <Input placeholder="0123456789" {...field} />
                      </FormControl>
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
                        <Input placeholder="978-0123456789" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="publisher"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Publisher</FormLabel>
                      <FormControl>
                        <Input placeholder="Publisher name" {...field} />
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
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="page_count"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pages</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="320" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="language"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Language</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select language" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="en">English</SelectItem>
                          <SelectItem value="zh">Chinese</SelectItem>
                          <SelectItem value="es">Spanish</SelectItem>
                          <SelectItem value="fr">French</SelectItem>
                          <SelectItem value="de">German</SelectItem>
                          <SelectItem value="ja">Japanese</SelectItem>
                        </SelectContent>
                      </Select>
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
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select format" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="hardcover">Hardcover</SelectItem>
                          <SelectItem value="paperback">Paperback</SelectItem>
                          <SelectItem value="ebook">E-book</SelectItem>
                          <SelectItem value="audiobook">Audiobook</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Categories */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Categories</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="genre"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Genre</FormLabel>
                      <FormControl>
                        <Input placeholder="Fiction, Non-fiction, etc." {...field} />
                      </FormControl>
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
                        <Input placeholder="Mystery, Biography, etc." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Series Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Series Information</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="series_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Series Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Series name (if applicable)" {...field} />
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
                        <Input type="number" placeholder="1, 2, 3..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Description & Cover */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Brief description of the book"
                        className="resize-none"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cover_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cover Image URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://example.com/book-cover.jpg" {...field} />
                    </FormControl>
                    <FormDescription>
                      Optional: URL to the book cover image
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Reading Status */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="reading_status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reading Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select reading status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="want_to_read">Want to Read</SelectItem>
                        <SelectItem value="currently_reading">Currently Reading</SelectItem>
                        <SelectItem value="read">Read</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Book
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}