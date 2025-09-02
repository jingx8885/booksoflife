"use client";

import { BookSearch } from "./book-search";
import { ExternalBookResult } from "@/types/book";
import { useTranslations } from "next-intl";

interface BookSearchWrapperProps {
  autoFocus?: boolean;
  placeholder?: string;
}

export function BookSearchWrapper({ autoFocus = false, placeholder }: BookSearchWrapperProps) {
  const t = useTranslations();
  
  const handleAddToLibrary = (book: ExternalBookResult) => {
    // Mock function - replace with actual implementation
    console.log("Adding book to library:", book);
    // TODO: Implement actual book addition logic
    // This could involve calling an API route or using a context
  };

  return (
    <BookSearch 
      autoFocus={autoFocus}
      placeholder={placeholder || "Search books by title, author, or ISBN..."}
      onAddToLibrary={handleAddToLibrary}
    />
  );
}
