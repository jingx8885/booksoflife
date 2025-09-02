import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { LibraryDashboard } from "@/components/books/library-dashboard";
import { BookSearchWrapper } from "@/components/books/book-search-wrapper";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { getLibraryPage } from "@/services/page";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const libraryPage = await getLibraryPage(locale);

  let canonicalUrl = `${process.env.NEXT_PUBLIC_WEB_URL}/library`;

  if (locale !== "en") {
    canonicalUrl = `${process.env.NEXT_PUBLIC_WEB_URL}/${locale}/library`;
  }

  return {
    title: libraryPage.metadata.title,
    description: libraryPage.metadata.description,
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
  const libraryPage = await getLibraryPage(locale);
  
  const defaultTab = tab || "library";

  return (
    <div className="container py-6 md:py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{libraryPage.header.title}</h1>
        <p className="text-muted-foreground">
          {libraryPage.header.description}
        </p>
      </div>

      <Separator />

      {/* Main Content */}
      <Tabs value={defaultTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
          <TabsTrigger value="library">{libraryPage.tabs.library}</TabsTrigger>
          <TabsTrigger value="search">{libraryPage.tabs.search}</TabsTrigger>
          <TabsTrigger value="lists">{libraryPage.tabs.lists}</TabsTrigger>
        </TabsList>

        <TabsContent value="library" className="space-y-6">
          <Suspense fallback={<LibraryDashboardSkeleton />}>
            <LibraryDashboard />
          </Suspense>
        </TabsContent>

        <TabsContent value="search" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{libraryPage.search_tab.title}</CardTitle>
              <CardDescription>
                {libraryPage.search_tab.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BookSearchWrapper 
                autoFocus 
                placeholder={libraryPage.search_tab.placeholder}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="lists" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{libraryPage.lists_tab.title}</CardTitle>
              <CardDescription>
                {libraryPage.lists_tab.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <p>{libraryPage.lists_tab.coming_soon}</p>
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