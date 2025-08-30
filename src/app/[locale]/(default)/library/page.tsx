import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { LibraryDashboard } from "@/components/books/library-dashboard";
import { BookSearch } from "@/components/books/book-search";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations();

  let canonicalUrl = `${process.env.NEXT_PUBLIC_WEB_URL}/library`;

  if (locale !== "en") {
    canonicalUrl = `${process.env.NEXT_PUBLIC_WEB_URL}/${locale}/library`;
  }

  return {
    title: "My Library | BooksOfLife",
    description: "Manage your personal book library, track reading progress, and discover new books",
    alternates: {
      canonical: canonicalUrl,
    },
  };
}

export default async function LibraryPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { locale } = await params;
  const { tab } = await searchParams;
  
  const defaultTab = tab || "library";

  return (
    <div className="container py-6 md:py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Library</h1>
        <p className="text-muted-foreground">
          Manage your books, track your reading progress, and discover new titles
        </p>
      </div>

      <Separator />

      {/* Main Content */}
      <Tabs value={defaultTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
          <TabsTrigger value="library">My Books</TabsTrigger>
          <TabsTrigger value="search">Search Books</TabsTrigger>
          <TabsTrigger value="lists">My Lists</TabsTrigger>
        </TabsList>

        <TabsContent value="library" className="space-y-6">
          <Suspense fallback={<LibraryDashboardSkeleton />}>
            <LibraryDashboard />
          </Suspense>
        </TabsContent>

        <TabsContent value="search" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Search for Books</CardTitle>
              <CardDescription>
                Find books from external sources and add them to your library
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BookSearch 
                autoFocus 
                onAddToLibrary={(book) => {
                  // Mock function - replace with actual implementation
                  console.log("Adding book to library:", book);
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="lists" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>My Book Lists</CardTitle>
              <CardDescription>
                Organize your books into custom lists and collections
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <p>Book lists feature coming soon...</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
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