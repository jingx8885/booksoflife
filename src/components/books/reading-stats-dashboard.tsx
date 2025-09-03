"use client";

import { useState, useEffect } from "react";
import { BarChart3, Clock, BookOpen, Target, TrendingUp, Calendar } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";

interface ReadingStats {
  total_sessions: number;
  total_reading_time_hours: number;
  total_pages_read: number;
  average_session_minutes: number;
  reading_streak_days: number;
  timeframe: string;
}

export function ReadingStatsDashboard() {
  const t = useTranslations('reading_stats');
  const [stats, setStats] = useState<ReadingStats | null>(null);
  const [timeframe, setTimeframe] = useState("month");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadReadingStats();
  }, [timeframe]);

  const loadReadingStats = async () => {
    setIsLoading(true);
    
    try {
      const response = await fetch(`/api/reading-stats?timeframe=${timeframe}`);
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error("Error loading reading stats:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getTimeframeLabel = (tf: string) => {
    switch (tf) {
      case 'week': return 'This Week';
      case 'month': return 'This Month';
      case 'year': return 'This Year';
      default: return 'This Month';
    }
  };

  const getStreakBadgeColor = (days: number) => {
    if (days >= 7) return "default";
    if (days >= 3) return "secondary";
    return "outline";
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Reading Statistics
          </CardTitle>
          <CardDescription>Track your reading habits and progress</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 w-20 bg-muted animate-pulse rounded" />
                <div className="h-8 w-16 bg-muted animate-pulse rounded" />
                <div className="h-3 w-24 bg-muted animate-pulse rounded" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Reading Statistics
            </CardTitle>
            <CardDescription>Track your reading habits and progress</CardDescription>
          </div>
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {stats ? (
          <div className="space-y-6">
            {/* Main Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {/* Total Sessions */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <BookOpen className="h-4 w-4" />
                  Reading Sessions
                </div>
                <div className="text-3xl font-bold">{stats.total_sessions}</div>
                <div className="text-xs text-muted-foreground">
                  {getTimeframeLabel(timeframe)}
                </div>
              </div>

              {/* Total Reading Time */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  Reading Time
                </div>
                <div className="text-3xl font-bold">{stats.total_reading_time_hours}h</div>
                <div className="text-xs text-muted-foreground">
                  Total hours read
                </div>
              </div>

              {/* Pages Read */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <TrendingUp className="h-4 w-4" />
                  Pages Read
                </div>
                <div className="text-3xl font-bold">{stats.total_pages_read}</div>
                <div className="text-xs text-muted-foreground">
                  Pages completed
                </div>
              </div>

              {/* Average Session */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Target className="h-4 w-4" />
                  Avg Session
                </div>
                <div className="text-3xl font-bold">{stats.average_session_minutes}m</div>
                <div className="text-xs text-muted-foreground">
                  Average length
                </div>
              </div>
            </div>

            {/* Reading Streak */}
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="font-semibold">Reading Streak</div>
                  <div className="text-sm text-muted-foreground">
                    Keep up the great work!
                  </div>
                </div>
              </div>
              <Badge variant={getStreakBadgeColor(stats.reading_streak_days)} className="text-lg px-4 py-2">
                {stats.reading_streak_days} days
              </Badge>
            </div>

            {/* Additional Insights */}
            {stats.total_sessions > 0 && (
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-2">
                      <div className="text-sm text-muted-foreground">Pages per Session</div>
                      <div className="text-2xl font-bold">
                        {Math.round(stats.total_pages_read / stats.total_sessions)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-2">
                      <div className="text-sm text-muted-foreground">Reading Rate</div>
                      <div className="text-2xl font-bold">
                        {Math.round(stats.total_pages_read / Math.max(stats.total_reading_time_hours, 0.1))} pages/hour
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Motivational Messages */}
            {stats.reading_streak_days > 0 && (
              <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="text-sm font-medium text-green-800 dark:text-green-200">
                  {stats.reading_streak_days >= 7 
                    ? "🔥 Amazing! You're on fire with your reading streak!" 
                    : stats.reading_streak_days >= 3
                    ? "🌟 Great job! Keep the momentum going!"
                    : "📚 You're building a great reading habit!"}
                </div>
              </div>
            )}

            {/* Empty State */}
            {stats.total_sessions === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <div className="text-lg font-medium mb-2">No reading sessions yet</div>
                <div className="text-sm">
                  Start a reading session to begin tracking your progress!
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <div className="text-lg font-medium mb-2">Unable to load statistics</div>
            <div className="text-sm">Please try again later</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}