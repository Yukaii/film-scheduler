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
import { Checkbox } from "@/components/ui/checkbox";
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
}

export function FillBlankModal({
  open,
  setOpen,
  startTime,
  endTime,
  films,
  filmsMap,
  onAddSession,
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

  // Get unique categories from films
  const categories = useMemo(() => {
    const categoriesSet = new Set<string>();
    films.forEach((film) => {
      if (film.sectionIds && Array.isArray(film.sectionIds)) {
        film.sectionIds.forEach((id) => categoriesSet.add(id));
      }
    });
    return Array.from(categoriesSet);
  }, [films]);

  // Filter films based on duration, search term, and selected category
  const suggestedFilms = useMemo(() => {
    if (!startTime || !endTime || selectedDuration <= 0) return [];

    // Filter films based on duration (with flexibility)
    const maxDuration = selectedDuration + flexibilityMinutes;
    let filteredFilms = films.filter(
      (film) => film.duration > 0 && film.duration <= maxDuration
    );

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
        (film) => 
          film.sectionIds && 
          Array.isArray(film.sectionIds) && 
          film.sectionIds.includes(selectedCategory)
      );
    }

    // Sort by how close the duration is to the selected time slot
    return filteredFilms.sort((a, b) => {
      const aDiff = Math.abs(selectedDuration - a.duration);
      const bDiff = Math.abs(selectedDuration - b.duration);
      return aDiff - bDiff;
    });
  }, [films, startTime, endTime, selectedDuration, searchTerm, selectedCategory, flexibilityMinutes]);

  // Create a custom session from a film
  const createCustomSession = (film: Film) => {
    if (!startTime) return null;
    
    const newSession: Omit<Session, "id"> = {
      filmId: film.id,
      time: startTime.getTime(),
      location: "自訂場次",
    };
    
    const session = {
      ...newSession,
      id: generateSessionId(newSession),
    };
    
    return session;
  };

  // Handle adding a session
  const handleAddSession = (film: Film) => {
    const session = createCustomSession(film);
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
                （{selectedDuration} 分鐘）找到以下建議的影片：
              </>
            ) : (
              <>請先選擇時段</>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="duration" className="col-span-1">時間彈性</Label>
            <div className="col-span-3 flex items-center gap-2">
              <Slider
                id="duration"
                defaultValue={[flexibilityMinutes]}
                max={30}
                step={5}
                onValueChange={(values) => setFlexibilityMinutes(values[0])}
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
                <SelectItem value="all">全部類別</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
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

        <ScrollArea className="flex-1 h-[340px] border rounded-md p-2">
          {suggestedFilms.length > 0 ? (
            <div className="space-y-2">
              {suggestedFilms.map((film) => (
                <div
                  key={film.id}
                  className="p-3 hover:bg-muted rounded-md flex justify-between items-center"
                >
                  <div>
                    <div className="font-medium">{film.filmTitle}</div>
                    <div className="text-sm text-muted-foreground">
                      {film.directorName} | {film.duration} 分鐘
                    </div>
                  </div>
                  <Button size="sm" onClick={() => handleAddSession(film)}>
                    加入
                  </Button>
                </div>
              ))}
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