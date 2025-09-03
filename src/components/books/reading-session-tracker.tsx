"use client";

import { useState, useEffect } from "react";
import { Play, Pause, Square, Clock, BookOpen } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ReadingSession, BookListItem } from "@/types/book";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

interface ReadingSessionTrackerProps {
  book: BookListItem;
  onProgressUpdate?: () => void;
}

export function ReadingSessionTracker({ book, onProgressUpdate }: ReadingSessionTrackerProps) {
  const t = useTranslations('reading_tracker');
  const [activeSession, setActiveSession] = useState<ReadingSession | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [sessionTime, setSessionTime] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [startPage, setStartPage] = useState(0);
  const [endPage, setEndPage] = useState(0);
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [mood, setMood] = useState("");

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (activeSession && activeSession.status === "active") {
      interval = setInterval(() => {
        const now = new Date().getTime();
        const start = new Date(activeSession.session_start).getTime();
        setSessionTime(Math.floor((now - start) / 1000));
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [activeSession]);

  // Load active session on mount
  useEffect(() => {
    loadActiveSession();
  }, [book.book_uuid]);

  const loadActiveSession = async () => {
    try {
      const response = await fetch(`/api/books/${book.book_uuid}/active-session`);
      if (response.ok) {
        const data = await response.json();
        if (data.session) {
          setActiveSession(data.session);
          setStartPage(data.session.start_page || 0);
          setCurrentPage(data.session.end_page || data.session.start_page || 0);
          setLocation(data.session.location || "");
          setNotes(data.session.notes || "");
        }
      }
    } catch (error) {
      console.error("Error loading active session:", error);
    }
  };

  const startReadingSession = async () => {
    setIsStarting(true);
    
    try {
      const response = await fetch('/api/reading-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start',
          book_uuid: book.book_uuid,
          start_page: startPage || undefined,
          location: location || undefined
        })
      });

      if (!response.ok) {
        throw new Error('Failed to start reading session');
      }

      const data = await response.json();
      setActiveSession(data.session);
      setCurrentPage(startPage);
      
      toast.success('Reading session started!');
      
      if (onProgressUpdate) {
        onProgressUpdate();
      }
    } catch (error) {
      console.error('Error starting reading session:', error);
      toast.error('Failed to start reading session');
    } finally {
      setIsStarting(false);
    }
  };

  const endReadingSession = async () => {
    if (!activeSession) return;

    setIsEnding(true);
    
    try {
      const response = await fetch('/api/reading-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'end',
          session_uuid: activeSession.uuid,
          end_page: endPage || currentPage || undefined,
          notes: notes || undefined,
          mood: mood || undefined
        })
      });

      if (!response.ok) {
        throw new Error('Failed to end reading session');
      }

      const data = await response.json();
      setActiveSession(null);
      setSessionTime(0);
      setNotes("");
      setMood("");
      
      toast.success(`Reading session completed! Read ${data.session.pages_read} pages in ${Math.round((data.session.reading_duration_minutes || 0))} minutes.`);
      
      if (onProgressUpdate) {
        onProgressUpdate();
      }
    } catch (error) {
      console.error('Error ending reading session:', error);
      toast.error('Failed to end reading session');
    } finally {
      setIsEnding(false);
    }
  };

  const updateSessionProgress = async () => {
    if (!activeSession) return;

    try {
      await fetch(`/api/reading-sessions/${activeSession.uuid}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_page: currentPage,
          notes: notes || undefined
        })
      });

      toast.success('Progress updated!');
    } catch (error) {
      console.error('Error updating progress:', error);
      toast.error('Failed to update progress');
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Reading Session Tracker
        </CardTitle>
        <CardDescription>
          Track your reading progress for "{book.book?.title}"
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Session Status */}
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-3">
            {activeSession ? (
              <>
                <Badge variant="secondary" className="animate-pulse">
                  <Play className="h-3 w-3 mr-1" />
                  Active Session
                </Badge>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span className="font-mono text-lg">{formatTime(sessionTime)}</span>
                </div>
              </>
            ) : (
              <Badge variant="outline">No Active Session</Badge>
            )}
          </div>
          
          {!activeSession ? (
            <Button
              onClick={startReadingSession}
              disabled={isStarting}
              className="gap-2"
            >
              <Play className="h-4 w-4" />
              {isStarting ? 'Starting...' : 'Start Reading'}
            </Button>
          ) : (
            <Button
              onClick={endReadingSession}
              disabled={isEnding}
              variant="destructive"
              className="gap-2"
            >
              <Square className="h-4 w-4" />
              {isEnding ? 'Ending...' : 'End Session'}
            </Button>
          )}
        </div>

        {/* Progress Input */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {!activeSession && (
            <div>
              <Label htmlFor="start-page">Starting Page</Label>
              <Input
                id="start-page"
                type="number"
                min="1"
                value={startPage || ''}
                onChange={(e) => setStartPage(parseInt(e.target.value) || 0)}
                placeholder="Enter starting page"
              />
            </div>
          )}

          <div>
            <Label htmlFor="current-page">
              {activeSession ? 'Current Page' : 'Current Page'}
            </Label>
            <Input
              id="current-page"
              type="number"
              min="1"
              value={currentPage || ''}
              onChange={(e) => setCurrentPage(parseInt(e.target.value) || 0)}
              placeholder="Enter current page"
            />
          </div>

          {activeSession && (
            <div>
              <Label htmlFor="end-page">End Page (for session end)</Label>
              <Input
                id="end-page"
                type="number"
                min="1"
                value={endPage || ''}
                onChange={(e) => setEndPage(parseInt(e.target.value) || 0)}
                placeholder="Page when ending session"
              />
            </div>
          )}

          <div>
            <Label htmlFor="location">Reading Location</Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g., Home, Coffee shop, Library"
              disabled={!!activeSession}
            />
          </div>
        </div>

        {/* Progress Bar */}
        {book.book?.page_count && currentPage > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Reading Progress</span>
              <span>{Math.round((currentPage / book.book.page_count) * 100)}%</span>
            </div>
            <Progress 
              value={(currentPage / book.book.page_count) * 100} 
              className="h-2"
            />
            <div className="text-xs text-muted-foreground">
              Page {currentPage} of {book.book.page_count}
            </div>
          </div>
        )}

        {/* Notes and Mood */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="notes">Session Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes about your reading session..."
              rows={3}
            />
          </div>

          {activeSession && (
            <div>
              <Label htmlFor="mood">Current Mood</Label>
              <Select value={mood} onValueChange={setMood}>
                <SelectTrigger>
                  <SelectValue placeholder="How are you feeling?" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="focused">🎯 Focused</SelectItem>
                  <SelectItem value="relaxed">😌 Relaxed</SelectItem>
                  <SelectItem value="excited">🤩 Excited</SelectItem>
                  <SelectItem value="curious">🤔 Curious</SelectItem>
                  <SelectItem value="emotional">😢 Emotional</SelectItem>
                  <SelectItem value="inspired">✨ Inspired</SelectItem>
                  <SelectItem value="tired">😴 Tired</SelectItem>
                  <SelectItem value="distracted">😵 Distracted</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {activeSession && (
          <div className="flex gap-2">
            <Button onClick={updateSessionProgress} variant="outline" className="flex-1">
              Update Progress
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}