import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "@/components/Icons";
import dayjs from "dayjs";
import "dayjs/locale/en";
import timezone from "dayjs/plugin/timezone";
import isBetween from "dayjs/plugin/isBetween";
import { Film, Session } from "./types";
import { useAppContext } from "@/contexts/AppContext";
import {
  cn,
  findSessionIndex,
  getSessionDuration,
  includesSession,
  scrollNowIndicatorIntoView,
  joinSessions,
} from "@/lib/utils";
import { useSidebar } from "./ui/sidebar";
import { X, CalendarIcon, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import useBoundingClientRect from "@/hooks/useBoundingClientRect";
import useStateRef from "@/hooks/useStateRef";

dayjs.extend(isBetween);
dayjs.locale("en");
dayjs.extend(timezone);

dayjs.tz.setDefault("Asia/Taipei");

interface WeekViewProps {
  currentWeekStart: dayjs.Dayjs;
  selectedSessions: Session[];
  previewSessions: Session[];
}

function WeekView({
  currentWeekStart,
  selectedSessions,
  previewSessions,
}: WeekViewProps) {
  // Initial virtual window settings
  const [virtualWindowSize, setVirtualWindowSize] = useState(28);
  const [virtualWindowStart, setVirtualWindowStart] = useState(
    currentWeekStart.subtract(virtualWindowSize / 2, "day")
  );
  
  // Update virtual window when current week changes
  useEffect(() => {
    // When deliberately changing weeks via UI controls, re-center the window
    setVirtualWindowStart(currentWeekStart.subtract(virtualWindowSize / 2, "day"));
  }, [currentWeekStart, virtualWindowSize]);

  // Generate days array based on virtual window
  const weekDays = useMemo(() => {
    return Array.from(
      { length: virtualWindowSize },
      (_, i) => virtualWindowStart.add(i, "day")
    );
  }, [virtualWindowStart, virtualWindowSize]);

  const {
    filmsMap,
    addSession,
    removeSession,
    revealFilmDetail,
    viewingFilmId,
    setTimeSelection,
  } = useAppContext();

  const startHour = 10;
  const hoursInDay = 14;

  const sessions = joinSessions(selectedSessions, previewSessions);

  // Current time state to track "now"
  const [now, setNow] = useState(dayjs());

  // Update the current time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(dayjs());
    }, 60000); // Update every 60 seconds

    // Cleanup interval on component unmount
    return () => clearInterval(interval);
  }, []);

  // Calculate the position of the current time indicator
  const nowHourOffset = now.hour() - startHour;
  const nowMinute = now.minute();
  const nowPosition = nowHourOffset * 60 + nowMinute + 30; // Position of the current time in pixels

  // States for time selection
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartDay, setDragStartDay] = useState<dayjs.Dayjs | null>(null);
  const [dragStartPos, setDragStartPos] = useState<number | null>(null);
  const [dragEndDay, setDragEndDay] = useState<dayjs.Dayjs | null>(null);
  const [dragEndPos, setDragEndPos] = useState<number | null>(null);
  const weekViewRef = useRef<HTMLDivElement>(null);

  const weekviewRect = useBoundingClientRect(weekViewRef);
  const weekviewWidth = useMemo(
    () => weekviewRect?.width || 0,
    [weekviewRect],
  );
  const dayWidth = useMemo(
    () => weekviewWidth / 8, // days + time column
    [weekviewWidth],
  );

  // Initialize dayTranslateOffset based on today's date
  const [dayTranslateOffset, setDayTranslateOffset, dayTranslateOffsetRef] = useStateRef<number>((() => {
    // use today to calculate the offset
    const today = dayjs();
    const offset = today.diff(virtualWindowStart, "day") + 7; // Offset to center the current day in the window

    return offset * dayWidth;
  })());

  // Add a new state for vertical scrolling
  const [dayTranslateOffsetY, setDayTranslateOffsetY, dayTranslateOffsetYRef] = useStateRef<number>(0);

  // Track whether the window has been modified by scrolling
  // This prevents the offset being reset when the window is extended
  const [windowModifiedByScroll, setWindowModifiedByScroll] = useState(false);

  // Thresholds for extending virtual window (in days)
  const extendThreshold = 3; // Extend when we're within 3 days of an edge
  const trimThreshold = 7; // Keep at least 7 days on each side after trimming

  // Handle scroll/wheel event with infinite scroll logic
  useEffect(() => {
    const weekViewElement = weekViewRef.current;
    
    const handleScroll = (e: WheelEvent) => {
      // Handle horizontal scroll
      if (e.deltaX !== 0) {
        const scrollOffset = e.deltaX;
        
        // Calculate new offset
        const newOffset = dayTranslateOffsetRef.current + scrollOffset;
        setDayTranslateOffset(newOffset);
        
        // Calculate visible range in the virtual window
        const daysScrolledFromStart = Math.floor(newOffset / dayWidth);
        const visibleDaysEndIndex = daysScrolledFromStart + 7; // 7 visible days
        
        // Check if we're approaching start or end of virtual window
        const daysFromStart = daysScrolledFromStart;
        const daysFromEnd = virtualWindowSize - visibleDaysEndIndex;
        
        // Extend in either direction if needed
        let newStart = virtualWindowStart;
        let offsetAdjustment = 0;
        let sizeAdjustment = 0;
        
        // If approaching start, prepend days
        if (daysFromStart < extendThreshold) {
          const daysToAdd = 7; // Add a week at a time
          newStart = virtualWindowStart.subtract(daysToAdd, "day");
          offsetAdjustment = daysToAdd * dayWidth;
          sizeAdjustment = daysToAdd;
          
          // Trim from end if window gets too large
          if (virtualWindowSize + daysToAdd > 30) {
            const daysToTrim = Math.min(daysToAdd, virtualWindowSize - (7 + trimThreshold));
            sizeAdjustment = daysToAdd - daysToTrim;
          }
        }
        // If approaching end, append days
        else if (daysFromEnd < extendThreshold) {
          const daysToAdd = 7; // Add a week at a time
          sizeAdjustment = daysToAdd;
          
          // Trim from start if window gets too large
          if (virtualWindowSize + daysToAdd > 30) {
            const daysToTrim = Math.min(daysToAdd, virtualWindowSize - (7 + trimThreshold));
            newStart = virtualWindowStart.add(daysToTrim, "day");
            // When trimming from start AND scrolling toward the end, we need to adjust the offset
            // to maintain the visual position of what the user is currently viewing
            offsetAdjustment = -daysToTrim * dayWidth;
            sizeAdjustment = daysToAdd - daysToTrim;
          }
        }
        
        // Apply changes if needed
        if (offsetAdjustment !== 0 || sizeAdjustment !== 0) {
          setWindowModifiedByScroll(true); // Mark window as modified by scroll
          
          // Update in a single batch to prevent visual jank
          const updatedVirtualWindowSize = virtualWindowSize + sizeAdjustment;
          const updatedOffset = dayTranslateOffsetRef.current + offsetAdjustment;
          
          setVirtualWindowStart(newStart);
          setVirtualWindowSize(updatedVirtualWindowSize);
          setDayTranslateOffset(updatedOffset);
        }
      }
      
      // Handle vertical scroll
      if (e.deltaY !== 0) {
        // Update vertical offset
        const newOffsetY = dayTranslateOffsetYRef.current + e.deltaY;
        
        // Limit the vertical scroll to stay within reasonable bounds
        // Height of the full calendar content is hoursInDay * 60 pixels
        const maxScrollY = hoursInDay * 60 - 400; // Subtract viewport height approximate
        const limitedOffsetY = Math.max(0, Math.min(newOffsetY, maxScrollY));
        
        setDayTranslateOffsetY(limitedOffsetY);
      }
      
      e.preventDefault();
    };

    if (weekViewElement) {
      weekViewElement.addEventListener("wheel", handleScroll);
    }
    return () => {
      if (weekViewElement) {
        weekViewElement.removeEventListener("wheel", handleScroll);
      }
    };
  }, [virtualWindowStart, virtualWindowSize, dayWidth, dayTranslateOffsetRef, dayTranslateOffsetYRef, hoursInDay]);

  // Only recalculate translation offset when day width changes or window start changes,
  // but ONLY if the window hasn't been modified by scroll
  useEffect(() => {
    if (dayWidth > 0 && !windowModifiedByScroll) {
      const today = dayjs();
      const offset = today.diff(virtualWindowStart, "day");
      setDayTranslateOffset(offset * dayWidth);
    }
  }, [dayWidth, virtualWindowStart, windowModifiedByScroll]);

  // Reset the window modified flag when current week changes from UI controls
  useEffect(() => {
    setWindowModifiedByScroll(false);
  }, [currentWeekStart]);

  // Helper function to convert screen position to time
  const positionToTime = (day: dayjs.Dayjs, posY: number): Date => {
    // Adjust posY by the vertical offset to get accurate time
    const adjustedPosY = posY + dayTranslateOffsetY;
    const hourOffset = Math.floor(adjustedPosY / 60);
    const minuteOffset = Math.round((adjustedPosY % 60) / 5) * 5; // Round to nearest 5 min
    return day.hour(startHour + hourOffset).minute(minuteOffset).toDate();
  };

  // Handle mouse down to start selection
  const handleMouseDown = (e: React.MouseEvent, day: dayjs.Dayjs) => {
    // Only handle left mouse button
    if (e.button !== 0) return;
    
    // Don't start drag if clicked on a session block
    if ((e.target as HTMLElement).closest('.session-block')) {
      return;
    }
    
    // Find the position relative to the day column
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const posY = e.clientY - rect.top;
    
    setIsDragging(true);
    setDragStartDay(day);
    setDragStartPos(posY);
    setDragEndDay(day);
    setDragEndPos(posY);
  };

  // Handle mouse move during selection
  const handleMouseMove = (e: React.MouseEvent, day: dayjs.Dayjs) => {
    if (!isDragging) return;
    
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const posY = e.clientY - rect.top;
    
    setDragEndDay(day);
    setDragEndPos(posY);
  };

  // Handle mouse up to end selection
  const handleMouseUp = useCallback(() => {
    if (!isDragging || !dragStartDay || !dragEndDay || dragStartPos === null || dragEndPos === null) {
      setIsDragging(false);
      return;
    }

    // Convert positions to actual times
    const startTime = positionToTime(dragStartDay, dragStartPos);
    const endTime = positionToTime(dragEndDay, dragEndPos);
    
    // Call the context method to set the selected time range
    setTimeSelection(startTime, endTime);
    
    // Reset the drag state
    setIsDragging(false);
    setDragStartDay(null);
    setDragStartPos(null);
    setDragEndDay(null);
    setDragEndPos(null);
    
    // Prevent any click events for the next few milliseconds to avoid triggering session clicks
    weekViewRef.current?.setAttribute('data-prevent-clicks', 'true');
    setTimeout(() => {
      weekViewRef.current?.removeAttribute('data-prevent-clicks');
    }, 300);
  }, [isDragging, dragStartDay, dragEndDay, dragStartPos, dragEndPos, setTimeSelection, dayTranslateOffsetY]);

  // Handle mouse leave during selection to cancel it
  const handleMouseLeave = () => {
    if (isDragging) {
      setIsDragging(false);
      setDragStartDay(null);
      setDragStartPos(null);
      setDragEndDay(null);
      setDragEndPos(null);
    }
  };

  // Calculate selection overlay position and dimensions
  const getSelectionStyle = () => {
    if (!isDragging || !dragStartDay || !dragEndDay || dragStartPos === null || dragEndPos === null) {
      return null;
    }

    const startDayIndex = weekDays.findIndex(day => day.isSame(dragStartDay, 'day'));
    const endDayIndex = weekDays.findIndex(day => day.isSame(dragEndDay, 'day'));
    
    if (startDayIndex === -1 || endDayIndex === -1) return null;

    const minDayIndex = Math.min(startDayIndex, endDayIndex);
    const maxDayIndex = Math.max(startDayIndex, endDayIndex);
    const minPosY = Math.min(dragStartPos, dragEndPos) + 30;
    const maxPosY = Math.max(dragStartPos, dragEndPos) + 30;

    // Calculate grid column based on day index (adding 2 because of the time column)
    return {
      gridColumn: `${minDayIndex + 2} / ${maxDayIndex + 3}`,
      top: `${minPosY}px`,
      height: `${maxPosY - minPosY}px`,
      width: '100%', // This will make it fill the entire grid cell
      left: '0',
    };
  };

  const selectionStyle = getSelectionStyle();

  useEffect(() => {
    // Add global mouse up handler to catch events outside the calendar
    const handleGlobalMouseUp = () => {
      if (isDragging) {
        handleMouseUp();
      }
    };

    document.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDragging, dragStartDay, dragEndDay, dragStartPos, dragEndPos, handleMouseUp]);

  // For debugging
  const visibleDaysRange = useMemo(() => {
    const startIndex = Math.floor(dayTranslateOffset / dayWidth);
    return `${startIndex} to ${startIndex + 7}`;
  }, [dayTranslateOffset, dayWidth]);

  // Get the actual day range being displayed (for debugging)
  const actualDaysRange = useMemo(() => {
    if (weekDays.length === 0) return "";
    const startIndex = Math.floor(dayTranslateOffset / dayWidth);
    const endIndex = Math.min(startIndex + 7, weekDays.length);
    
    if (startIndex >= weekDays.length || endIndex <= 0) return "Out of range";
    
    const visibleStartDay = weekDays[Math.max(0, startIndex)];
    const visibleEndDay = weekDays[Math.min(endIndex - 1, weekDays.length - 1)];
    
    return `${visibleStartDay?.format("MM/DD")} to ${visibleEndDay?.format("MM/DD")}`;
  }, [dayTranslateOffset, dayWidth, weekDays]);

  return (
    <div 
      className="relative overflow-hidden max-h-full"
      style={{
        '--day-width': `${dayWidth}px`,
        height: 'calc(100vh - 68px)',
        display: 'grid',
        gridTemplateColumns: `var(--day-width) repeat(${virtualWindowSize}, var(--day-width))`,
      } as React.CSSProperties}
      ref={weekViewRef}
      data-is-dragging={isDragging}
    >
      {/* Time Labels Column */}
      <div className="w-full pb-4 py-7 bg-background mb-4 z-10 md:px-4 px-1">
        <div className="relative h-[840px] select-none" style={{ transform: `translateY(${-dayTranslateOffsetY}px)` }}>
          {Array.from({ length: hoursInDay + 1 }, (_, hour) => (
            <div
              key={hour}
              className="absolute left-0 w-full"
              style={{ top: `${hour * 60}px`, height: "60px" }}
            >
              <span className="md:text-xs text-[10px] absolute p-1 -top-3 bg-background">
                {dayjs()
                  .hour(startHour + hour)
                  .format("h A")}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Current Time Indicator Line */}
      {nowHourOffset >= 0 && nowHourOffset < hoursInDay && (
        <div
          className="absolute left-0 w-full h-[1px] bg-red-500 z-10"
          id="now-indicator"
          style={{ 
            top: `${nowPosition - dayTranslateOffsetY}px`,
            display: (nowPosition - dayTranslateOffsetY < 0 || nowPosition - dayTranslateOffsetY > 840) ? 'none' : 'block'
          }}
        >
          <span className="absolute bg-red-500 text-white text-xs px-1 rounded-b left-2">
            Now {now.format("HH:mm")}
          </span>
        </div>
      )}

      {/* Week Days Columns */}
      {weekDays.map((day, index) => {
        const isSameDay = now.isSame(day, "day");

        return (
          <div
            key={day.format("YYYY-MM-DD")}
            className="w-full pb-4 bg-background mb-4 relative group/day"
            style={{
              transform: `translateX(${-dayTranslateOffset}px)`,
            }}
          >
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div 
                    className="md:text-sm pb-2 text-xs text-center h-7 sticky top-0 bg-background z-10 border-solid border-b-2 border-border whitespace-nowrap select-none cursor-pointer hover:bg-muted transition-colors"
                    onClick={() => {
                      const startTime = day.hour(10).minute(0).toDate();
                      const endTime = day.hour(23).minute(59).toDate();
                      setTimeSelection(startTime, endTime);
                    }}
                  >
                    <span
                      className={cn({
                        "font-semibold": isSameDay,
                      })}
                    >
                      {day.format("ddd")}
                    </span>{" "}
                    <span
                      className={cn("p-0.5", {
                        "bg-red-500 text-white rounded": isSameDay,
                      })}
                    >
                      {day.format("D")}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>點擊篩選當日影片</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <div 
              className="relative h-[840px] border-t border-b border-border"
              onMouseDown={(e) => handleMouseDown(e, day)}
              onMouseMove={(e) => handleMouseMove(e, day)}
              onMouseLeave={handleMouseLeave}
              style={{ transform: `translateY(${-dayTranslateOffsetY}px)` }}
            >
              {Array.from({ length: hoursInDay }, (_, hour) => (
                <div
                  key={hour}
                  className="absolute left-0 w-full border-t border-border"
                  style={{ top: `${hour * 60}px`, height: "60px" }}
                />
              ))}

              {sessions
                .filter((session) => dayjs(session.time).isSame(day, "day"))
                .map((session) => (
                  <SessionBlock
                    key={session.id}
                    session={session}
                    filmsMap={filmsMap}
                    selectedSessions={selectedSessions}
                    previewSessions={previewSessions}
                    sessions={sessions}
                    viewingFilmId={viewingFilmId}
                    startHour={startHour}
                    addSession={addSession}
                    removeSession={removeSession}
                    revealFilmDetail={revealFilmDetail}
                  />
                ))}
            </div>
          </div>
        );
      })}

      {/* Selection overlay for time selection */}
      {selectionStyle && (
        <div 
          className="absolute bg-blue-500/30 border-2 border-blue-600 z-30 pointer-events-none shadow-lg backdrop-blur-[1px]"
          style={selectionStyle}
        >
          <div className="absolute -left-2 top-0 px-2 py-1 bg-blue-600 rounded-md text-white text-xs shadow-md">
            {positionToTime(dragStartDay!, Math.min(dragStartPos!, dragEndPos!)).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
          </div>
          <div className="absolute -right-2 bottom-0 px-2 py-1 bg-blue-600 rounded-md text-white text-xs shadow-md">
            {positionToTime(dragEndDay!, Math.max(dragStartPos!, dragEndPos!)).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
          </div>
        </div>
      )}
      
      {/* Debug info - can be removed in production */}
      
      <div className="absolute bottom-2 right-2 bg-black/70 text-white p-2 rounded text-xs z-50">
        <div>Window size: {virtualWindowSize} days</div>
        <div>Window start: {virtualWindowStart.format("MM/DD")}</div>
        <div>Offset X: {Math.round(dayTranslateOffset)}px ({Math.floor(dayTranslateOffset/dayWidth)} days)</div>
        <div>Offset Y: {Math.round(dayTranslateOffsetY)}px</div>
        <div>Visible days: {visibleDaysRange}</div>
        <div>Date range: {actualDaysRange}</div>
      </div>
     
    </div>
  );
}

interface SessionBlockProps {
  session: Session;
  filmsMap: Map<string, Film>;
  selectedSessions: Session[];
  previewSessions: Session[];
  viewingFilmId: string | undefined;
  startHour: number;
  addSession: (session: Session) => void;
  removeSession: (session: Session) => void;
  revealFilmDetail: (film: Film) => void;
  sessions: Session[];
}

function SessionBlock({
  session,
  filmsMap,
  selectedSessions,
  previewSessions,
  viewingFilmId,
  startHour,
  addSession,
  sessions,
  removeSession,
  revealFilmDetail,
}: SessionBlockProps) {
  const film = filmsMap.get(session.filmId);
  if (!film) return null;

  const sessionId = session.id;

  const startTime = dayjs(session.time);
  const endTime = startTime.add(film.duration, "minute");
  const startHourOffset = startTime.hour() - startHour;
  const startMinute = startTime.minute();
  const top = startHourOffset * 60 + startMinute;
  const isTinyCard = film.duration <= 25;

  let height: number;
  if (viewingFilmId === session.filmId && film.duration < 60) {
    height = 60;
  } else {
    height = isTinyCard ? 25 : film.duration;
  }

  const overlappingSessions = sessions
    .filter((s) => {
      const targetSessionFilm = filmsMap.get(s.filmId);
      if (!targetSessionFilm) return false;

      const targetStartTime = dayjs(s.time);
      const targetEndTime = dayjs(s.time).add(
        targetSessionFilm.duration,
        "minute",
      );

      return (
        targetStartTime.isSame(startTime, "day") &&
        (targetStartTime.isBetween(startTime, endTime, null, "[]") ||
          targetEndTime.isBetween(startTime, endTime, null, "[]"))
      );
    })
    .sort(
      (a, b) =>
        getSessionDuration(a, filmsMap) - getSessionDuration(b, filmsMap),
    );

  const overlappedIndex = findSessionIndex(overlappingSessions, session);
  const offset = (overlappedIndex + 1) * 10;
  const width = `calc(100% - ${offset + 10}px)`;
  const left = `${10 + offset}px`;

  const isSelectedSession = includesSession(selectedSessions, session);
  const isPreviewSession = includesSession(previewSessions, session);

  const zIndex = viewingFilmId === session.filmId ? 5 : 4 - overlappedIndex;

  return (
    <div
      id={sessionId}
      key={sessionId}
      className={cn(
        "absolute max-w-[calc(100%-10px)] text-white rounded shadow transition-opacity duration-200 hover:opacity-100",
        "border-4 border-solid border-transparent overflow-hidden group/sessionblock",
        "select-none session-block",
        {
          "opacity-70 hover:cursor-zoom-in bg-slate-600 dark:bg-slate-800 border-slate-600 dark:border-slate-800":
            !isSelectedSession,
          "opacity-100 dark:bg-violet-900 bg-violet-500 dark:hover:border-white cursor-pointer hover:border-violet-700":
            isSelectedSession,
          "p-0": isTinyCard,
          "p-1": !isTinyCard,
        },
      )}
      onClick={() => {        
        if (isPreviewSession) {
          addSession(session);
        }
        if (isSelectedSession) {
          revealFilmDetail(film);
        }
      }}
      style={{
        top: `${top}px`,
        height: `${height}px`,
        width,
        left,
        zIndex,
      }}
      title={film.filmTitle}
    >
      {isSelectedSession && (
        <button
          className={cn(
            "absolute md:hidden md:group-hover/sessionblock:block",
            {
              "top-1 right-1": !isTinyCard,
              "top-0.5 right-0.5": isTinyCard,
            },
          )}
          onClick={(e) => {
            e.stopPropagation();
            removeSession(session);
          }}
        >
          <X className="text-white" size={isTinyCard ? 10 : 16} />
        </button>
      )}

      <div className="text-xs font-medium w-full pr-4">{film.filmTitle}</div>
      <p className="text-[10px] text-white/60 mb-1">
        {startTime.format(startTime.minute() === 0 ? "HH" : "HH:mm")} ‒{" "}
        {endTime.format(endTime.minute() === 0 ? "HH A" : "HH:mm A")}
      </p>
      <p className="text-[10px] text-white/80">{session.location}</p>
    </div>
  );
}

export function CalendarView(props: { className?: string }) {
  const { currentDate, previewSessions, selectedSessions, setCurrentDate } =
    useAppContext();
  const currentWeekStart = useMemo(
    () => dayjs(currentDate).startOf("week"),
    [currentDate],
  );

  const navigateWeek = (direction: "previous" | "next") => {
    setCurrentDate((prev) => {
      const currentDayjs = dayjs(prev);
      return direction === "next"
        ? currentDayjs.add(1, "week").toDate()
        : currentDayjs.subtract(1, "week").toDate();
    });
  };

  const { open, isMobile, openMobile, toggleSidebar } = useSidebar();
  const goToToday = () => {
    setCurrentDate(new Date());
    scrollNowIndicatorIntoView();
  };

  return (
    <div className={cn("w-full", props.className)}>
      <div className="py-2 md:py-4 flex justify-between items-center sticky top-0 bg-background z-20 md:px-4">
        <div className="flex items-center">
          <Button variant="ghost" onClick={toggleSidebar}>
            {(isMobile ? openMobile : open) ? (
              <PanelLeftClose size={16} />
            ) : (
              <PanelLeftOpen size={16} />
            )}
          </Button>

          <Button
            variant="ghost"
            onClick={() => navigateWeek("previous")}
            className="mr-2"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="mx-2">
                {dayjs(currentDate).format("YYYY/MM")}{" "}
                <CalendarIcon className="ml-2 h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={currentDate}
                onSelect={(date) => {
                  if (date) {
                    setCurrentDate(date);
                  }
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <Button
            variant="ghost"
            onClick={() => navigateWeek("next")}
            className="ml-2"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={goToToday}>
            今天
          </Button>
        </div>
      </div>

      <WeekView
        currentWeekStart={currentWeekStart}
        selectedSessions={selectedSessions}
        previewSessions={previewSessions}
      />
    </div>
  );
}
