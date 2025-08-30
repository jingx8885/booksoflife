"use client";

import { useState, useEffect } from "react";
import { Plus, MoreHorizontal, Edit, Trash2, Share2, Lock, Unlock, Grid, List, Search, Filter, SortAsc } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookCover, BookCoverGrid } from "@/components/ui/books/book-cover";
import { BookList, BookListItem, Book } from "@/types/book";

interface BookListsProps {
  lists?: BookList[];
  onCreateList?: (list: Omit<BookList, "id" | "uuid" | "created_at" | "updated_at">) => void;
  onUpdateList?: (listUuid: string, updates: Partial<BookList>) => void;
  onDeleteList?: (listUuid: string) => void;
  onAddBookToList?: (listUuid: string, bookUuid: string) => void;
  onRemoveBookFromList?: (listUuid: string, bookUuid: string) => void;
  className?: string;
}

export function BookLists({
  lists = [],
  onCreateList,
  onUpdateList,
  onDeleteList,
  onAddBookToList,
  onRemoveBookFromList,
  className
}: BookListsProps) {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("name");
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const filteredLists = lists
    .filter(list => {
      const matchesSearch = list.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          list.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = filterType === "all" || 
                          (filterType === "public" && list.is_public) ||
                          (filterType === "private" && !list.is_public) ||
                          (filterType === "default" && list.is_default);
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "created":
          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
        case "books":
          return (b.book_count || 0) - (a.book_count || 0);
        default:
          return 0;
      }
    });

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">My Book Lists</h2>
            <p className="text-muted-foreground">
              Organize your books into custom collections
            </p>
          </div>
          <CreateListDialog 
            open={showCreateDialog}
            onOpenChange={setShowCreateDialog}
            onSubmit={onCreateList}
          />
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search lists..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex gap-2">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Lists</SelectItem>
                <SelectItem value="public">Public</SelectItem>
                <SelectItem value="private">Private</SelectItem>
                <SelectItem value="default">Default</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="created">Created Date</SelectItem>
                <SelectItem value="books">Book Count</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex rounded-lg border p-1">
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("grid")}
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Lists Display */}
      {filteredLists.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-muted flex items-center justify-center">
              <Plus className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No lists found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || filterType !== "all" 
                ? "No lists match your current filters"
                : "Create your first book list to get started"
              }
            </p>
            {!searchQuery && filterType === "all" && (
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First List
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className={
          viewMode === "grid" 
            ? "grid gap-4 md:grid-cols-2 lg:grid-cols-3" 
            : "space-y-4"
        }>
          {filteredLists.map((list) => (
            <BookListCard
              key={list.uuid}
              list={list}
              viewMode={viewMode}
              onUpdate={onUpdateList}
              onDelete={onDeleteList}
              onAddBook={onAddBookToList}
              onRemoveBook={onRemoveBookFromList}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface BookListCardProps {
  list: BookList;
  viewMode: "grid" | "list";
  onUpdate?: (listUuid: string, updates: Partial<BookList>) => void;
  onDelete?: (listUuid: string) => void;
  onAddBook?: (listUuid: string, bookUuid: string) => void;
  onRemoveBook?: (listUuid: string, bookUuid: string) => void;
}

function BookListCard({ list, viewMode, onUpdate, onDelete, onAddBook, onRemoveBook }: BookListCardProps) {
  const [showEditDialog, setShowEditDialog] = useState(false);

  const mockBooks = [
    { id: "1", title: "Sample Book 1", author: "Author 1", cover_url: "" },
    { id: "2", title: "Sample Book 2", author: "Author 2", cover_url: "" },
    { id: "3", title: "Sample Book 3", author: "Author 3", cover_url: "" },
    { id: "4", title: "Sample Book 4", author: "Author 4", cover_url: "" }
  ];

  if (viewMode === "list") {
    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-semibold text-lg">{list.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {list.book_count || 0} books
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {list.is_public ? (
                    <Badge variant="secondary">Public</Badge>
                  ) : (
                    <Badge variant="outline">Private</Badge>
                  )}
                  {list.is_default && <Badge>Default</Badge>}
                  <ListActions 
                    list={list} 
                    onEdit={() => setShowEditDialog(true)}
                    onDelete={() => onDelete?.(list.uuid)}
                  />
                </div>
              </div>
              
              {list.description && (
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                  {list.description}
                </p>
              )}
              
              <BookCoverGrid 
                books={mockBooks} 
                size="xs" 
                maxItems={8} 
              />
            </div>
          </div>
        </CardContent>
        
        <EditListDialog
          list={list}
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          onSubmit={(updates) => onUpdate?.(list.uuid, updates)}
        />
      </Card>
    );
  }

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer group">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-base line-clamp-1">{list.name}</CardTitle>
            <CardDescription>
              {list.book_count || 0} books
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            {list.is_public ? (
              <Badge variant="secondary" className="text-xs">Public</Badge>
            ) : (
              <Badge variant="outline" className="text-xs">Private</Badge>
            )}
            {list.is_default && <Badge className="text-xs">Default</Badge>}
            <ListActions 
              list={list} 
              onEdit={() => setShowEditDialog(true)}
              onDelete={() => onDelete?.(list.uuid)}
            />
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {list.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {list.description}
          </p>
        )}
        
        <BookCoverGrid 
          books={mockBooks} 
          size="xs" 
          maxItems={6} 
        />
      </CardContent>
      
      <EditListDialog
        list={list}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        onSubmit={(updates) => onUpdate?.(list.uuid, updates)}
      />
    </Card>
  );
}

interface ListActionsProps {
  list: BookList;
  onEdit: () => void;
  onDelete: () => void;
}

function ListActions({ list, onEdit, onDelete }: ListActionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onEdit}>
          <Edit className="h-4 w-4 mr-2" />
          Edit List
        </DropdownMenuItem>
        {list.is_public && (
          <DropdownMenuItem>
            <Share2 className="h-4 w-4 mr-2" />
            Share List
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={onDelete}
          className="text-destructive focus:text-destructive"
          disabled={list.is_default}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete List
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface CreateListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit?: (list: Omit<BookList, "id" | "uuid" | "created_at" | "updated_at">) => void;
}

function CreateListDialog({ open, onOpenChange, onSubmit }: CreateListDialogProps) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    is_public: false,
    list_type: "custom" as const
  });

  const handleSubmit = () => {
    if (!formData.name.trim()) return;
    
    onSubmit?.({
      user_uuid: "current-user", // Replace with actual user UUID
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      is_public: formData.is_public,
      is_default: false,
      list_type: formData.list_type,
      sort_order: 0
    });
    
    // Reset form
    setFormData({
      name: "",
      description: "",
      is_public: false,
      list_type: "custom"
    });
    
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create List
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New List</DialogTitle>
          <DialogDescription>
            Create a custom list to organize your books
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="list-name">List Name *</Label>
            <Input
              id="list-name"
              placeholder="Enter list name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="list-description">Description</Label>
            <Textarea
              id="list-description"
              placeholder="Describe your list (optional)"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch
              id="list-public"
              checked={formData.is_public}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_public: checked }))}
            />
            <Label htmlFor="list-public" className="flex items-center gap-2">
              {formData.is_public ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
              Make this list public
            </Label>
          </div>
          
          {formData.is_public && (
            <p className="text-xs text-muted-foreground">
              Public lists can be viewed and shared with other users
            </p>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!formData.name.trim()}>
            Create List
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface EditListDialogProps {
  list: BookList;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (updates: Partial<BookList>) => void;
}

function EditListDialog({ list, open, onOpenChange, onSubmit }: EditListDialogProps) {
  const [formData, setFormData] = useState({
    name: list.name,
    description: list.description || "",
    is_public: list.is_public
  });

  const handleSubmit = () => {
    if (!formData.name.trim()) return;
    
    onSubmit({
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      is_public: formData.is_public
    });
    
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit List</DialogTitle>
          <DialogDescription>
            Update your list information
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-list-name">List Name *</Label>
            <Input
              id="edit-list-name"
              placeholder="Enter list name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="edit-list-description">Description</Label>
            <Textarea
              id="edit-list-description"
              placeholder="Describe your list (optional)"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
            />
          </div>
          
          {!list.is_default && (
            <div className="flex items-center space-x-2">
              <Switch
                id="edit-list-public"
                checked={formData.is_public}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_public: checked }))}
              />
              <Label htmlFor="edit-list-public" className="flex items-center gap-2">
                {formData.is_public ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                Make this list public
              </Label>
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!formData.name.trim()}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}