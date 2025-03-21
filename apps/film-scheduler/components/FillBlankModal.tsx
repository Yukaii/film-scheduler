import React, { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Film, Session } from "./types";
import dayjs from "dayjs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn, generateSessionId } from "@/lib/utils";

interface FillBlankModalProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  startTime: Date | null;
  endTime: Date | null;
  films: Film[];
  filmsMap: Map<string, Film>;
  onAddSession: (session: Session) => void;
  sections: Array<{ id: string; name: string }>;
}

export function FillBlankModal({
  open,
  setOpen,
  startTime,
  endTime,
  films,
  filmsMap,
  onAddSession,
  sections,
}: FillBlankModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [flexibilityMinutes, setFlexibilityMinutes] = useState(10);

  // Close the modal
  const onClose = () => setOpen(false);

  // Calculate the duration between start and end time in minutes
  const selectedDuration = useMemo(() => {
    if (!startTime || !endTime) return 0;
    return dayjs(endTime).diff(dayjs(startTime), "minute");
  }, [startTime, endTime]);

  // Get unique categories with names
  const categories = useMemo(() => {
    if (!sections || !Array.isArray(sections)) return [];
    
    const allCategory = { id: "all", name: "全部類別" };
    const sortedSections = [...sections].sort((a, b) => a.name.localeCompare(b.name));
    
    return [allCategory, ...sortedSections];
  }, [sections]);

  // Filter films based on duration, search term, and selected category
  const suggestedFilms = useMemo(() => {
    if (!startTime || !endTime || selectedDuration <= 0) return [];

    // Get the selected day and time
    const selectedStartTime = dayjs(startTime);
    const selectedEndTime = dayjs(endTime);
    
    // Filter films based on duration
    let filteredFilms = films.filter((film) => film.duration > 0);
    
    // Filter to only include films that have appropriate sessions on the selected day
    filteredFilms = filteredFilms.filter(film => {
      if (!film.schedule || film.schedule.length === 0) return false;
      
      // Check if any of the film's sessions are on the selected day AND
      // could potentially be watched during the selected time window
      return film.schedule.some(session => {
        const sessionStart = dayjs(session.time);
        
        // Must be on the same day
        if (!sessionStart.isSame(selectedStartTime, 'day')) return false;

        // Include any session that starts on the selected day
        // This will show all available sessions for that day
        return true;
      });
    });

    // Apply search filter if provided
    if (searchTerm.trim()) {
      const lowercaseTerm = searchTerm.toLowerCase();
      filteredFilms = filteredFilms.filter(
        (film) =>
          film.filmTitle.toLowerCase().includes(lowercaseTerm) ||
          film.filmOriginalTitle.toLowerCase().includes(lowercaseTerm) ||
          film.directorName.toLowerCase().includes(lowercaseTerm) ||
          film.directorOriginalName.toLowerCase().includes(lowercaseTerm)
      );
    }

    // Apply category filter if provided
    if (selectedCategory !== "all") {
      filteredFilms = filteredFilms.filter(
        (film) => film.sectionIds?.includes(selectedCategory)
      );
    }

    // Sort by how close the duration is to the selected time slot
    return filteredFilms.sort((a, b) => {
      const aDiff = Math.abs(selectedDuration - a.duration);
      const bDiff = Math.abs(selectedDuration - b.duration);
      return aDiff - bDiff;
    });
  }, [films, startTime, endTime, selectedDuration, searchTerm, selectedCategory]);

  // Create a session from a film
  const createSession = (film: Film) => {
    if (!startTime) return null;
    
    // Get the selected day
    const selectedDate = dayjs(startTime).startOf('day');
    const filmSessions = film.schedule || [];
    
    // Find sessions on the same day as the selected time
    const sessionsOnSameDay = filmSessions.filter(session => 
      dayjs(session.time).isSame(selectedDate, 'day')
    );
    
    // If there are sessions on the same day, find the closest one to the selected time
    if (sessionsOnSameDay.length > 0) {
      let bestSession = sessionsOnSameDay[0];
      let bestTimeDiff = Infinity;
      
      // Find the session closest to our selected time
      for (const session of sessionsOnSameDay) {
        const sessionTime = dayjs(session.time);
        const selectedStartTime = dayjs(startTime);
        const timeDiff = Math.abs(sessionTime.diff(selectedStartTime, 'minute'));
        
        if (timeDiff < bestTimeDiff) {
          bestTimeDiff = timeDiff;
          bestSession = session;
        }
      }
      
      // Use the exact session as is, without modifying its time
      return {
        ...bestSession,
        id: bestSession.id || generateSessionId(bestSession)
      };
    }
    
    // Only if no sessions exist on the selected day, create a custom one
    const newSession: Omit<Session, "id"> = {
      filmId: film.id,
      time: startTime.getTime(),
      location: "場次未定",
    };
    
    return {
      ...newSession,
      id: generateSessionId(newSession),
    };
  };

  // Handle adding a session
  const handleAddSession = (film: Film) => {
    const session = createSession(film);
    if (session) {
      onAddSession(session);
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-[500px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>填滿時段</DialogTitle>
          <DialogDescription>
            {startTime && endTime ? (
              <>
                 針對 {dayjs(startTime).format("MM/DD HH:mm")} - {dayjs(endTime).format("HH:mm")} 
                的 {selectedDuration} 分鐘時段，建議可觀看的影片
              </>
            ) : (
              "請選擇時段"
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="flexibility" className="col-span-1">
              彈性時間
            </Label>
            <div className="flex items-center gap-4 col-span-3">
              <Slider
                id="flexibility"
                defaultValue={[flexibilityMinutes]}
                max={60}
                step={5}
                className="flex-1"
                onValueChange={([value]) => setFlexibilityMinutes(value)}
              />
              <span className="w-12 text-right">+{flexibilityMinutes}分</span>
            </div>
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="category" className="col-span-1">類別</Label>
            <Select 
              value={selectedCategory} 
              onValueChange={setSelectedCategory}
            >
              <SelectTrigger id="category" className="col-span-3">
                <SelectValue placeholder="全部類別" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="search" className="col-span-1">搜尋</Label>
            <Input
              id="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="片名/導演"
              className="col-span-3"
            />
          </div>
        </div>

        <ScrollArea className="flex-1 h-[340px] border rounded-md p-2 overflow-y-auto">
          {suggestedFilms.length > 0 ? (
            <div className="space-y-2">
              {suggestedFilms.map((film) => {
                // Get all sessions for this film on the selected day
                const sessionsOnDay = film.schedule?.filter(s => 
                  dayjs(s.time).isSame(dayjs(startTime), 'day')
                ).sort((a, b) => dayjs(a.time).diff(dayjs(b.time))) || [];
                
                return (
                  <div
                    key={film.id}
                    className="p-3 hover:bg-muted rounded-md flex justify-between"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{film.filmTitle}</div>
                      <div className="text-sm text-muted-foreground">
                        {film.directorName} | {film.duration} 分鐘 | {film.sectionIds.map(id => sections.find(s => s.id === id)?.name).filter(Boolean).join(', ')}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {sessionsOnDay.map((session) => {
                          const sessionStart = dayjs(session.time);
                          const sessionEnd = sessionStart.add(film.duration, 'minute');

                          const isOverlapping = (
                            sessionStart.isBefore(dayjs(endTime)) && 
                            sessionEnd.isAfter(dayjs(startTime))
                          );
                          
                          return (
                            <div 
                              key={session.id} 
                              className={cn(
                                "text-xs px-2 py-1 rounded-full",
                                "border border-border",
                                isOverlapping ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                              )}
                              title={isOverlapping ? "此場次與選取時段重疊" : "此場次在選取時段外"}
                            >
                              {dayjs(session.time).format("HH:mm")} @ {session.location}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div className="ml-4 flex items-start">
                      <Button size="sm" onClick={() => handleAddSession(film)}>
                        加入
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              沒有找到符合條件的影片
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}