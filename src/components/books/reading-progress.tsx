"use client";

import { useState } from "react";
import { Calendar, Clock, BookOpen, Target, Plus, Minus, Save, X } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { BookCover } from "@/components/ui/books/book-cover";
import { Book, ReadingSession, ReadingProgress as ReadingProgressType } from "@/types/book";

interface ReadingProgressProps {
  book: Book;
  progress: ReadingProgressType;
  onUpdateProgress?: (progress: Partial<ReadingProgressType>) => void;
  onAddSession?: (session: Omit<ReadingSession, "id" | "uuid" | "created_at" | "updated_at">) => void;
}

export function ReadingProgress({ 
  book, 
  progress, 
  onUpdateProgress, 
  onAddSession 
}: ReadingProgressProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editingProgress, setEditingProgress] = useState({
    current_page: progress.current_page,
    reading_status: progress.reading_status
  });

  const handleSaveProgress = () => {
    const percentage = book.page_count 
      ? Math.round((editingProgress.current_page / book.page_count) * 100)
      : 0;
    
    onUpdateProgress?.({
      current_page: editingProgress.current_page,
      progress_percentage: percentage,
      reading_status: editingProgress.reading_status
    });
    
    setIsEditing(false);
  };

  const handleQuickUpdate = (pages: number) => {
    const newPage = Math.max(0, Math.min(
      (progress.current_page || 0) + pages, 
      book.page_count || 1000
    ));
    
    const percentage = book.page_count 
      ? Math.round((newPage / book.page_count) * 100)
      : 0;

    onUpdateProgress?.({
      current_page: newPage,
      progress_percentage: percentage
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <BookCover
              src={book.cover_url}
              alt={book.title}
              title={book.title}
              author={book.author}
              size="md"
            />
            <div className="flex-1">
              <CardTitle className="text-xl">{book.title}</CardTitle>
              <CardDescription className="text-base">by {book.author}</CardDescription>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant={
                  progress.reading_status === "read" ? "default" :
                  progress.reading_status === "currently_reading" ? "secondary" :
                  "outline"
                }>
                  {progress.reading_status.replace("_", " ")}
                </Badge>
                {book.page_count && (
                  <Badge variant="outline">
                    {book.page_count} pages
                  </Badge>
                )}
                {book.genre && (
                  <Badge variant="outline">
                    {book.genre}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Reading Progress</span>
              <span>{progress.progress_percentage}%</span>
            </div>
            <Progress value={progress.progress_percentage} className="h-3" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Page {progress.current_page || 0}</span>
              <span>of {book.page_count || "?"}</span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickUpdate(-10)}
              disabled={!progress.current_page || progress.current_page <= 0}
            >
              <Minus className="h-4 w-4 mr-1" />
              -10 pages
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickUpdate(-1)}
              disabled={!progress.current_page || progress.current_page <= 0}
            >
              <Minus className="h-4 w-4 mr-1" />
              -1 page
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickUpdate(1)}
              disabled={book.page_count && progress.current_page >= book.page_count}
            >
              <Plus className="h-4 w-4 mr-1" />
              +1 page
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickUpdate(10)}
              disabled={book.page_count && progress.current_page >= book.page_count}
            >
              <Plus className="h-4 w-4 mr-1" />
              +10 pages
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
            >
              Edit Progress
            </Button>
          </div>

          {/* Reading Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
            <div className="text-center">
              <div className="text-lg font-semibold">
                {progress.total_reading_time_hours || 0}h
              </div>
              <div className="text-xs text-muted-foreground">Total Time</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold">
                {progress.sessions_count || 0}
              </div>
              <div className="text-xs text-muted-foreground">Sessions</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold">
                {progress.date_started ? 
                  Math.ceil((Date.now() - new Date(progress.date_started).getTime()) / (1000 * 60 * 60 * 24)) 
                  : 0
                }
              </div>
              <div className="text-xs text-muted-foreground">Days Reading</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold">
                {progress.last_session_date ? 
                  Math.floor((Date.now() - new Date(progress.last_session_date).getTime()) / (1000 * 60 * 60 * 24))
                  : "?"
                }d
              </div>
              <div className="text-xs text-muted-foreground">Since Last Read</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Progress Dialog */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Reading Progress</DialogTitle>
            <DialogDescription>
              Update your current page and reading status
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="current-page">Current Page</Label>
                <Input
                  id="current-page"
                  type="number"
                  min="0"
                  max={book.page_count || 1000}
                  value={editingProgress.current_page || 0}
                  onChange={(e) => setEditingProgress(prev => ({
                    ...prev,
                    current_page: parseInt(e.target.value) || 0
                  }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reading-status">Reading Status</Label>
                <Select
                  value={editingProgress.reading_status}
                  onValueChange={(value: any) => setEditingProgress(prev => ({
                    ...prev,
                    reading_status: value
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="want_to_read">Want to Read</SelectItem>
                    <SelectItem value="currently_reading">Currently Reading</SelectItem>
                    <SelectItem value="read">Read</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                    <SelectItem value="abandoned">Abandoned</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {book.page_count && (
              <div className="text-sm text-muted-foreground">
                Progress: {Math.round(((editingProgress.current_page || 0) / book.page_count) * 100)}%
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveProgress}>
              Save Progress
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Reading Session */}
      <ReadingSessionDialog 
        book={book} 
        currentPage={progress.current_page || 0}
        onAddSession={onAddSession} 
      />
    </div>
  );
}

interface ReadingSessionDialogProps {
  book: Book;
  currentPage: number;
  onAddSession?: (session: Omit<ReadingSession, "id" | "uuid" | "created_at" | "updated_at">) => void;
}

function ReadingSessionDialog({ book, currentPage, onAddSession }: ReadingSessionDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [sessionData, setSessionData] = useState({
    start_page: currentPage,
    end_page: currentPage,
    reading_duration_minutes: 30,
    notes: "",
    mood: "",
    location: ""
  });

  const handleSubmit = () => {
    const session: Omit<ReadingSession, "id" | "uuid" | "created_at" | "updated_at"> = {
      user_uuid: "current-user", // Replace with actual user UUID
      book_uuid: book.uuid,
      session_start: new Date().toISOString(),
      session_end: new Date().toISOString(),
      pages_read: Math.max(0, sessionData.end_page - sessionData.start_page),
      start_page: sessionData.start_page,
      end_page: sessionData.end_page,
      reading_duration_minutes: sessionData.reading_duration_minutes,
      notes: sessionData.notes || undefined,
      mood: sessionData.mood || undefined,
      location: sessionData.location || undefined,
      reading_goal_met: false,
      status: "completed"
    };

    onAddSession?.(session);
    setIsOpen(false);
    
    // Reset form
    setSessionData({
      start_page: currentPage,
      end_page: currentPage,
      reading_duration_minutes: 30,
      notes: "",
      mood: "",
      location: ""
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Card className="hover:bg-muted/50 cursor-pointer transition-colors">
          <CardContent className="p-4">
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Plus className="h-4 w-4" />
              <span>Log Reading Session</span>
            </div>
          </CardContent>
        </Card>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Log Reading Session</DialogTitle>
          <DialogDescription>
            Record your reading session for {book.title}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-page">Start Page</Label>
              <Input
                id="start-page"
                type="number"
                min="0"
                value={sessionData.start_page}
                onChange={(e) => setSessionData(prev => ({
                  ...prev,
                  start_page: parseInt(e.target.value) || 0
                }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-page">End Page</Label>
              <Input
                id="end-page"
                type="number"
                min={sessionData.start_page}
                value={sessionData.end_page}
                onChange={(e) => setSessionData(prev => ({
                  ...prev,
                  end_page: parseInt(e.target.value) || 0
                }))}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="duration">Reading Duration (minutes)</Label>
            <Input
              id="duration"
              type="number"
              min="1"
              value={sessionData.reading_duration_minutes}
              onChange={(e) => setSessionData(prev => ({
                ...prev,
                reading_duration_minutes: parseInt(e.target.value) || 30
              }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="mood">Mood</Label>
              <Select 
                value={sessionData.mood} 
                onValueChange={(value) => setSessionData(prev => ({ ...prev, mood: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select mood" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="excited">Excited</SelectItem>
                  <SelectItem value="focused">Focused</SelectItem>
                  <SelectItem value="relaxed">Relaxed</SelectItem>
                  <SelectItem value="curious">Curious</SelectItem>
                  <SelectItem value="tired">Tired</SelectItem>
                  <SelectItem value="distracted">Distracted</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                placeholder="e.g., Home, Cafe, Library"
                value={sessionData.location}
                onChange={(e) => setSessionData(prev => ({
                  ...prev,
                  location: e.target.value
                }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Session Notes</Label>
            <Textarea
              id="notes"
              placeholder="What did you think about this session?"
              value={sessionData.notes}
              onChange={(e) => setSessionData(prev => ({
                ...prev,
                notes: e.target.value
              }))}
              rows={3}
            />
          </div>

          <div className="text-sm text-muted-foreground">
            Pages read: {Math.max(0, sessionData.end_page - sessionData.start_page)}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            Log Session
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}