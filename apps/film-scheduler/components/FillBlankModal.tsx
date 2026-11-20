import React, { useMemo, useState } from "react";
import { Check, ChevronDown, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Film, Session } from "./types";
import dayjs from "@/lib/dayjs";
import { SearchInput } from "./SearchInput";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn, generateSessionId } from "@/lib/utils";
import { filterFilmsAdvanced } from "@/lib/searchParser";

interface FillBlankModalProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  startTime: Date | null;
  endTime: Date | null;
  films: Film[];
  filmsMap: Map<string, Film>;
  onAddSession: (session: Session) => void;
  onRemoveSession?: (session: Session) => void;
  sections: Array<{ id: string; name: string }>;
  selectedSessions: Session[];
}

interface Candidate {
  film: Film;
  /** The film's sessions on the selected day, by start time. */
  sessions: Session[];
  /** Ids of the sessions that fit inside the window (with flexibility). */
  fitting: Set<string>;
  /** Start of the first fitting session, or of the first session if none fit. */
  sortKey: number;
}

const sessionKey = (s: Session) => s.id || generateSessionId(s);

export function FillBlankModal({
  open,
  setOpen,
  startTime,
  endTime,
  films,
  onAddSession,
  onRemoveSession = () => {},
  sections,
  selectedSessions,
}: FillBlankModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [flexibilityMinutes, setFlexibilityMinutes] = useState(10);
  const [showOthers, setShowOthers] = useState(false);

  const selectedDuration =
    startTime && endTime ? dayjs(endTime).diff(dayjs(startTime), "minute") : 0;

  // Films with at least one session on the selected day
  const filmsOnDay = useMemo(() => {
    if (!startTime) return [];
    const day = dayjs(startTime);
    return films.filter(
      (film) => film.duration > 0 && film.schedule?.some((s) => dayjs(s.time).isSame(day, "day")),
    );
  }, [films, startTime]);

  const categories = useMemo(() => {
    const ids = new Set(filmsOnDay.flatMap((film) => film.sectionIds ?? []));
    const valid = sections
      .filter((section) => ids.size === 0 || ids.has(section.id))
      .sort((a, b) => a.name.localeCompare(b.name));
    return [{ id: "all", name: "全部類別" }, ...valid];
  }, [sections, filmsOnDay]);

  // Split films into ones with a session that fits the gap and the rest of the day
  const { fits, others } = useMemo(() => {
    if (!startTime || !endTime || selectedDuration <= 0) return { fits: [], others: [] };

    let pool = filmsOnDay;
    if (searchTerm.trim()) pool = filterFilmsAdvanced(pool, searchTerm, sections);
    if (selectedCategory !== "all") {
      pool = pool.filter((film) => film.sectionIds?.includes(selectedCategory));
    }

    const day = dayjs(startTime);
    const windowStart = dayjs(startTime).subtract(flexibilityMinutes, "minute");
    const windowEnd = dayjs(endTime).add(flexibilityMinutes, "minute");

    const candidates: Candidate[] = pool.map((film) => {
      const sessions = film.schedule
        .filter((s) => dayjs(s.time).isSame(day, "day"))
        .sort((a, b) => a.time - b.time);
      const fittingSessions = sessions.filter((s) => {
        const start = dayjs(s.time);
        const end = start.add(film.duration, "minute");
        return !start.isBefore(windowStart) && !end.isAfter(windowEnd);
      });
      return {
        film,
        sessions,
        fitting: new Set(fittingSessions.map(sessionKey)),
        sortKey: (fittingSessions[0] ?? sessions[0]).time,
      };
    });

    const byTime = (a: Candidate, b: Candidate) => a.sortKey - b.sortKey;
    return {
      fits: candidates.filter((c) => c.fitting.size > 0).sort(byTime),
      others: candidates.filter((c) => c.fitting.size === 0).sort(byTime),
    };
  }, [
    filmsOnDay,
    startTime,
    endTime,
    selectedDuration,
    searchTerm,
    selectedCategory,
    flexibilityMinutes,
    sections,
  ]);

  const findSelected = (film: Film, session: Session) =>
    selectedSessions.find((s) => s.filmId === film.id && s.time === session.time);

  const toggleSession = (film: Film, session: Session) => {
    const selected = findSelected(film, session);
    if (selected) onRemoveSession(selected);
    else onAddSession({ ...session, id: sessionKey(session) });
  };

  const sectionNames = (film: Film) =>
    film.sectionIds
      .map((id) => sections.find((s) => s.id === id)?.name)
      .filter(Boolean)
      .join("、");

  const renderFilm = ({ film, sessions, fitting }: Candidate) => (
    <li key={film.id} className="rounded-lg px-3 py-2.5 transition-colors hover:bg-muted/60">
      <div className="flex items-baseline justify-between gap-3">
        <p className="truncate font-medium">{film.filmTitle}</p>
        <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
          {film.duration} 分
        </span>
      </div>
      <p className="truncate text-xs text-muted-foreground">
        {[film.directorName, sectionNames(film)].filter(Boolean).join(" · ")}
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {sessions.map((session) => {
          const start = dayjs(session.time);
          const selected = Boolean(findSelected(film, session));
          const fits = fitting.has(sessionKey(session));
          return (
            <button
              key={sessionKey(session)}
              type="button"
              aria-pressed={selected}
              onClick={() => toggleSession(film, session)}
              title={selected ? "點擊移除此場次" : fits ? "放得進這個空檔" : "在空檔之外"}
              className={cn(
                "inline-flex max-w-full items-center gap-1 rounded-md border px-2 py-1 text-xs transition-colors",
                selected
                  ? "border-transparent bg-brand text-brand-foreground"
                  : fits
                    ? "border-border bg-background text-foreground hover:bg-accent hover:text-accent-foreground"
                    : "border-dashed text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {selected ? (
                <Check className="size-3 shrink-0" strokeWidth={2.5} />
              ) : (
                <Plus className="size-3 shrink-0" />
              )}
              <span className="font-medium tabular-nums">
                {start.format("HH:mm")}–{start.add(film.duration, "minute").format("HH:mm")}
              </span>
              <span className="truncate opacity-80">{session.location}</span>
            </button>
          );
        })}
      </div>
    </li>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="flex max-h-[85vh] max-w-[540px] flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle>填滿時段</DialogTitle>
          <DialogDescription>
            {startTime && endTime
              ? `${dayjs(startTime).format("MM/DD HH:mm")} – ${dayjs(endTime).format("HH:mm")} · ${selectedDuration} 分鐘空檔`
              : "請選擇時段"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 px-6 pb-4">
          <div className="w-full">
            <SearchInput
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="搜尋片名、導演或 category: 語法"
              className="w-full"
              films={films}
              sections={sections}
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:items-center">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger aria-label="類別">
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
            <div className="flex items-center gap-3">
              <Label htmlFor="flexibility" className="shrink-0 text-xs text-muted-foreground">
                前後彈性
              </Label>
              <Slider
                id="flexibility"
                value={[flexibilityMinutes]}
                max={60}
                step={5}
                className="flex-1"
                onValueChange={([value]) => setFlexibilityMinutes(value)}
              />
              <span className="w-10 shrink-0 text-right text-xs tabular-nums">
                ±{flexibilityMinutes}分
              </span>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto border-t px-3 pb-4">
          <h3 className="sticky top-0 z-10 bg-background px-3 pt-4 pb-2 text-xs font-medium text-muted-foreground">
            放得進這個空檔 <span className="tabular-nums">{fits.length}</span>
          </h3>
          {fits.length > 0 ? (
            <ul className="space-y-0.5">{fits.map(renderFilm)}</ul>
          ) : (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              沒有場次放得進這個空檔，試試加大前後彈性
            </p>
          )}

          {others.length > 0 && (
            <>
              <button
                type="button"
                onClick={() => setShowOthers((v) => !v)}
                aria-expanded={showOthers}
                className="mt-3 flex w-full items-center gap-1 rounded-md px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <ChevronDown
                  className={cn("size-3.5 transition-transform", !showOthers && "-rotate-90")}
                />
                當天其他場次 <span className="tabular-nums">{others.length}</span>
              </button>
              {showOthers && <ul className="space-y-0.5 opacity-90">{others.map(renderFilm)}</ul>}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
