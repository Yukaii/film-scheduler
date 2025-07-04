import React, {
  useMemo,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import dayjs from "@/lib/dayjs";

import { Session } from "./types";
import { useAppContext } from "@/contexts/AppContext";
import {
  cn,
  joinSessions,
  VIRTUAL_SCROLL_EVENT,
  VIRTUAL_SCROLL_TO_NOW_EVENT,
  VirtualScrollToSessionEvent,
} from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import useBoundingClientRect from "@/hooks/useBoundingClientRect";
import useStateRef from "@/hooks/useStateRef";
import { useVirtualScroll } from "@/hooks/useVirtualScroll";
import { SessionBlock } from "./SessionBlock";
import useTailwindBreakpoints from "@/hooks/useTailwindBreakpoints";

// Thresholds for extending virtual window (in days)
const extendThreshold = 3; // Extend when we're within 3 days of an edge
const trimThreshold = 7; // Keep at least 7 days on each side after trimming

const startHour = 10;
const hoursInDay = 14;

const INITIAL_VIRTUAL_WINDOW_SIZE = 28; // Initial size of the virtual window in days

const TIME_COLUMN_WIDTH = 80; // Width of the time column in pixels

export interface WeekViewProps {
  viewWeekStart: dayjs.Dayjs;
  selectedSessions: Session[];
  previewSessions: Session[];
  onWeekStartChange: (date: dayjs.Dayjs) => void;
  highlightDate?: Date;
}

function useNowIndicator() {
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

  return {
    now,
    nowHourOffset,
    nowPosition,
  };
}

export function WeekView({
  viewWeekStart,
  selectedSessions,
  previewSessions,
  onWeekStartChange,
  highlightDate,
}: WeekViewProps) {
  const {
    filmsMap,
    addSession,
    removeSession,
    revealFilmDetail,
    viewingFilmId,
    setTimeSelection,
  } = useAppContext();
  const { nowPosition, now, nowHourOffset } = useNowIndicator();
  const { sm } = useTailwindBreakpoints();

  const timeColumnWidth = useMemo(() => {
    return sm ? TIME_COLUMN_WIDTH : 45;
  }, [sm]);

  // State to track if highlight is active
  const [isHighlightActive, setIsHighlightActive] = useState(false);
  const [currentHighlightDate, setCurrentHighlightDate] = useState<Date | undefined>(undefined);

  // Effect to manage highlight timeout
  useEffect(() => {
    if (highlightDate) {
      setIsHighlightActive(true);
      setCurrentHighlightDate(highlightDate);
      
      // Set a timeout to clear the highlight after 2 seconds
      const timer = setTimeout(() => {
        setIsHighlightActive(false);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [highlightDate]);

  const sessions = joinSessions(selectedSessions, previewSessions);

  // Initial virtual window settings
  const [virtualWindowSize, setVirtualWindowSize] = useState(
    INITIAL_VIRTUAL_WINDOW_SIZE
  );
  const [virtualWindowStart, setVirtualWindowStart] = useState(
    viewWeekStart.subtract(virtualWindowSize / 2, "day")
  );

  // Initialize dayTranslateOffset based on today's date
  const [dayTranslateOffsetX, setDayTranslateOffsetX, dayTranslateOffsetXRef] =
    useStateRef<number>(0);

  // Add a new state for vertical scrolling
  const [dayTranslateOffsetY, setDayTranslateOffsetY, dayTranslateOffsetYRef] =
    useStateRef<number>(0);

  // Generate days array based on virtual window
  const weekDays = useMemo(() => {
    return Array.from({ length: virtualWindowSize }, (_, i) =>
      virtualWindowStart.add(i, "day")
    );
  }, [virtualWindowStart, virtualWindowSize]);

  // Add state for magnetic snapping and transition effects
  const [isScrolling, setIsScrolling] = useState(false);
  const [useTransition, setUseTransition] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // States for time selection
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartDay, setDragStartDay] = useState<dayjs.Dayjs | null>(null);
  const [dragStartPos, setDragStartPos] = useState<number | null>(null);
  const [dragEndDay, setDragEndDay] = useState<dayjs.Dayjs | null>(null);
  const [dragEndPos, setDragEndPos] = useState<number | null>(null);
  const weekViewRef = useRef<HTMLDivElement>(null);

  const weekviewRect = useBoundingClientRect(weekViewRef);
  const weekviewWidth = useMemo(() => weekviewRect?.width || 0, [weekviewRect]);
  const dayWidth = useMemo(
    // days * days width + time column
    () => (weekviewWidth - timeColumnWidth) / 7,
    [weekviewWidth, timeColumnWidth]
  );

  // Add a new state for vertical scrolling
  const maxScrollY = useMemo(
    () => (hoursInDay + 1) * 60 - (weekviewRect?.height || 300),
    [weekviewRect]
  );

  // Initialize virtual scroll hook
  const { scrollToSession, scrollToNow, scrollToTime } = useVirtualScroll({
    weekDays,
    dayWidth,
    virtualWindowSize,
    weekviewRect,
    startHour,
    maxScrollY,
    setDayTranslateOffsetX,
    setDayTranslateOffsetY,
    setVirtualWindowStart,
  });

  // Only run this effect when the component mounts or when viewWeekStart changes
  useEffect(() => {
    if (dayWidth > 0 && weekDays.length > 0) {
      // The scrollToTime function now handles cases where the day is outside the virtual window
      scrollToTime(viewWeekStart, false, "left");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewWeekStart, dayWidth]);

  // Event listener for virtual scrolling to a specific session
  useEffect(() => {
    const handleVirtualScrollToSession = (
      event: CustomEvent<VirtualScrollToSessionEvent>
    ) => {
      const { sessionId } = event.detail;
      
      // Find the session in the data
      const targetSession = sessions.find(session => session.id === sessionId);
      if (!targetSession) {
        console.warn(`Session with id ${sessionId} not found`);
        return;
      }
      
      // scrollToSession now handles cases where the session's day is outside the virtual window
      scrollToSession(targetSession);
    };

    // Event listener for scrolling to the current time indicator
    const handleVirtualScrollToNow = () => {
      scrollToNow();
    };

    // Add event listeners
    document.addEventListener(
      VIRTUAL_SCROLL_EVENT,
      handleVirtualScrollToSession as EventListener
    );
    document.addEventListener(
      VIRTUAL_SCROLL_TO_NOW_EVENT,
      handleVirtualScrollToNow
    );

    // Clean up
    return () => {
      document.removeEventListener(
        VIRTUAL_SCROLL_EVENT,
        handleVirtualScrollToSession as EventListener
      );
      document.removeEventListener(
        VIRTUAL_SCROLL_TO_NOW_EVENT,
        handleVirtualScrollToNow
      );
    };
  }, [sessions, scrollToSession, scrollToNow]);

  // Handle scroll/wheel event with infinite scroll logic
  useEffect(() => {
    const weekViewElement = weekViewRef.current;

    const handleScroll = (e: WheelEvent) => {
      // Clear any existing timeout to identify when scrolling stops
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      // Set scrolling state to true
      if (!isScrolling) {
        setIsScrolling(true);
        setUseTransition(false);
      }

      // Handle horizontal scroll
      if (e.deltaX !== 0) {
        const scrollOffset = e.deltaX;

        // Calculate new offset
        const newOffset = dayTranslateOffsetXRef.current + scrollOffset;
        setDayTranslateOffsetX(newOffset);

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
            const daysToTrim = Math.min(
              daysToAdd,
              virtualWindowSize - (7 + trimThreshold)
            );
            sizeAdjustment = daysToAdd - daysToTrim;
          }
        }
        // If approaching end, append days
        else if (daysFromEnd < extendThreshold) {
          const daysToAdd = 7; // Add a week at a time
          sizeAdjustment = daysToAdd;

          // Trim from start if window gets too large
          if (virtualWindowSize + daysToAdd > 30) {
            const daysToTrim = Math.min(
              daysToAdd,
              virtualWindowSize - (7 + trimThreshold)
            );
            newStart = virtualWindowStart.add(daysToTrim, "day");
            // When trimming from start AND scrolling toward the end, we need to adjust the offset
            // to maintain the visual position of what the user is currently viewing
            offsetAdjustment = -daysToTrim * dayWidth;
            sizeAdjustment = daysToAdd - daysToTrim;
          }
        }

        // Apply changes if needed
        if (offsetAdjustment !== 0 || sizeAdjustment !== 0) {
          // Update in a single batch to prevent visual jank
          const updatedVirtualWindowSize = virtualWindowSize + sizeAdjustment;
          const updatedOffset =
            dayTranslateOffsetXRef.current + offsetAdjustment;

          setVirtualWindowStart(newStart);
          setVirtualWindowSize(updatedVirtualWindowSize);
          setDayTranslateOffsetX(updatedOffset);
        }
      }

      // Handle vertical scroll
      if (e.deltaY !== 0) {
        // Update vertical offset
        const newOffsetY = dayTranslateOffsetYRef.current + e.deltaY;

        // Limit the vertical scroll to stay within reasonable bounds
        // Height of the full calendar content is hoursInDay * 60 pixels
        const limitedOffsetY = Math.max(0, Math.min(newOffsetY, maxScrollY));

        setDayTranslateOffsetY(limitedOffsetY);
      }

      // Start a timeout to detect when scrolling stops
      scrollTimeoutRef.current = setTimeout(() => {
        // Scrolling has stopped, apply magnetic snapping
        if (isScrolling) {
          // Calculate nearest day snap point
          const currentDayOffset = dayTranslateOffsetXRef.current / dayWidth;
          const nearestDay = Math.round(currentDayOffset);

          // Apply the transition effect when snapping
          setUseTransition(true);

          // Set the new offset with magnetic snapping
          setDayTranslateOffsetX(nearestDay * dayWidth);

          // Reset scrolling state
          setIsScrolling(false);
          
          // Calculate which week is now visible and notify parent component
          onWeekStartChange(visibleStartDayRef.current!);
        }
      }, 50); // 50ms delay to detect end of scroll

      e.preventDefault();
    };

    if (weekViewElement) {
      weekViewElement.addEventListener("wheel", handleScroll);
    }
    return () => {
      if (weekViewElement) {
        weekViewElement.removeEventListener("wheel", handleScroll);
      }
      // Clear any remaining timeout on unmount
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [
    virtualWindowStart,
    virtualWindowSize,
    dayWidth,
    dayTranslateOffsetXRef,
    dayTranslateOffsetYRef,
    isScrolling,
    setDayTranslateOffsetX,
    setDayTranslateOffsetY,
    maxScrollY,
    onWeekStartChange,
  ]);

  // Helper function to convert screen position to time
  const positionToTime = useCallback(
    (day: dayjs.Dayjs, posY: number): Date => {
      const hourOffset = Math.floor(posY / 60);
      const minuteOffset = Math.round((posY % 60) / 5) * 5; // Round to nearest 5 min
      return day
        .hour(startHour + hourOffset)
        .minute(minuteOffset)
        .toDate();
    },
    []
  );

  // Handle mouse down to start selection
  const handleMouseDown = (e: React.MouseEvent, day: dayjs.Dayjs) => {
    // Only handle left mouse button
    if (e.button !== 0) return;

    // Don't start drag if clicked on a session block
    if ((e.target as HTMLElement).closest(".session-block")) {
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
    if (
      !isDragging ||
      !dragStartDay ||
      !dragEndDay ||
      dragStartPos === null ||
      dragEndPos === null
    ) {
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
    weekViewRef.current?.setAttribute("data-prevent-clicks", "true");
    setTimeout(() => {
      weekViewRef.current?.removeAttribute("data-prevent-clicks");
    }, 300);
  }, [
    isDragging,
    dragStartDay,
    dragEndDay,
    dragStartPos,
    dragEndPos,
    positionToTime,
    setTimeSelection,
  ]);

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
    if (
      !isDragging ||
      !dragStartDay ||
      !dragEndDay ||
      dragStartPos === null ||
      dragEndPos === null ||
      !weekviewRect
    ) {
      return null;
    }

    const startDayIndex = weekDays.findIndex((day) =>
      day.isSame(dragStartDay, "day")
    );
    const endDayIndex = weekDays.findIndex((day) =>
      day.isSame(dragEndDay, "day")
    );

    if (startDayIndex === -1 || endDayIndex === -1) return null;

    // Get min and max positions without adjusting for scroll
    const minPosY = Math.min(dragStartPos, dragEndPos) + 30;
    const maxPosY = Math.max(dragStartPos, dragEndPos) + 30;

    // Calculate horizontal position that accounts for virtual scrolling
    // The offset in days (from virtual window start) to adjust the grid columns
    const dayOffset = Math.floor(dayTranslateOffsetX / dayWidth);

    // Calculate position relative to weekViewRef for absolute positioning
    return {
      position: "absolute" as const,
      transform: `translateY(${minPosY - dayTranslateOffsetY}px)`,
      height: `${maxPosY - minPosY}px`,
      width: dayWidth + "px",
      left: (startDayIndex - dayOffset) * dayWidth + timeColumnWidth + "px",
      zIndex: 40,
    };
  };

  const selectionStyle = getSelectionStyle();

  // Updated useEffect to also handle window resize for selection overlay
  useEffect(() => {
    // Add global mouse up handler to catch events outside the calendar
    const handleGlobalMouseUp = () => {
      if (isDragging) {
        handleMouseUp();
      }
    };

    document.addEventListener("mouseup", handleGlobalMouseUp);
    return () => {
      document.removeEventListener("mouseup", handleGlobalMouseUp);
    };
  }, [
    isDragging,
    dragStartDay,
    dragEndDay,
    dragStartPos,
    dragEndPos,
    handleMouseUp,
  ]);

  const visibleDaysRange = useMemo(() => {
    const startIndex = Math.floor(dayTranslateOffsetX / dayWidth);
    return `${startIndex} to ${startIndex + 7}`;
  }, [dayTranslateOffsetX, dayWidth]);

  const [visibleStartDay, visibleEndDay] = useMemo(() => {
    if (weekDays.length === 0) return [null, null];
    const startIndex = Math.floor(dayTranslateOffsetX / dayWidth);
    const endIndex = Math.min(startIndex + 7, weekDays.length);

    if (startIndex >= weekDays.length || endIndex <= 0) {
      console.warn("Invalid day range");
      return [null, null];
    }

    const visibleStartDay = weekDays[Math.max(0, startIndex)];
    const visibleEndDay = weekDays[Math.min(endIndex - 1, weekDays.length - 1)];

    return [visibleStartDay, visibleEndDay] as const;
  }, [dayTranslateOffsetX, dayWidth, weekDays]);

  const actualDaysRange = useMemo(() => {
    if (!visibleStartDay || !visibleEndDay) return "";
    return `${visibleStartDay.format("MM/DD")} to ${visibleEndDay.format(
      "MM/DD"
    )}`;
  }, [visibleStartDay, visibleEndDay]);

  // Visible day tracking ref for dayWidth changes
  const visibleStartDayRef = useRef<dayjs.Dayjs | null>(null);
  useEffect(() => {
    visibleStartDayRef.current = visibleStartDay;
  }, [visibleStartDay]);

  return (
    <div
      className="relative overflow-hidden max-h-full"
      style={
        {
          "--day-width": `${dayWidth}px`,
          height: "calc(100vh - 68px)",
          display: "grid",
          gridTemplateColumns: `${timeColumnWidth}px repeat(${virtualWindowSize}, var(--day-width))`,
        } as React.CSSProperties
      }
      ref={weekViewRef}
      data-is-dragging={isDragging}
    >
      {/* Time Labels Column */}
      <div className="w-full pb-4 py-7 bg-background mb-4 z-10 md:px-4 px-1">
        <div
          className="relative h-[840px] select-none"
          style={{ transform: `translateY(${-dayTranslateOffsetY}px)` }}
        >
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
            display:
              nowPosition - dayTranslateOffsetY < 0 ||
              nowPosition - dayTranslateOffsetY > 840
                ? "none"
                : "block",
          }}
        >
          <span className="absolute bg-red-500 text-white text-xs px-1 rounded-b left-2">
            Now {now.format("HH:mm")}
          </span>
        </div>
      )}

      {/* Week Days Columns */}
      {weekDays.map((day) => {
        const isSameDay = now.isSame(day, "day");
        const shouldHighlight = isHighlightActive && currentHighlightDate && day.isSame(dayjs(currentHighlightDate), "day");

        return (
          <div
            key={day.format("YYYY-MM-DD")}
            className={cn(
              "w-full pb-4 bg-background mb-4 relative group/day transition-colors",
              shouldHighlight && "bg-blue-50 dark:bg-blue-950/30"
            )}
            style={{
              transform: `translateX(${-dayTranslateOffsetX}px)`,
              transition: useTransition ? "transform 0.3s ease-out" : "none",
            }}
          >
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className={cn(
                      "md:text-sm pb-2 text-xs text-center h-7 sticky top-0 bg-background z-10 border-solid border-b-2 border-border whitespace-nowrap select-none cursor-pointer hover:bg-muted transition-colors",
                      shouldHighlight && "bg-blue-100 dark:bg-blue-900/50"
                    )}
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
                        "bg-blue-500 text-white rounded": shouldHighlight && !isSameDay,
                      })}
                    >
                      {day.format("D")}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>點擊篩選當日影片</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <div
              className={cn(
                "relative h-[840px] border-t border-b border-border",
                shouldHighlight && "bg-blue-50/70 dark:bg-blue-950/20"
              )}
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
            {positionToTime(
              dragStartDay!,
              Math.min(dragStartPos!, dragEndPos!)
            ).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </div>
          <div className="absolute -right-2 bottom-0 px-2 py-1 bg-blue-600 rounded-md text-white text-xs shadow-md">
            {positionToTime(
              dragEndDay!,
              Math.max(dragStartPos!, dragEndPos!)
            ).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </div>
        </div>
      )}

      {/* Debug info - shown only in development */}
      {process.env.NODE_ENV === "development" && (
        <div className="absolute bottom-2 right-2 bg-black/70 text-white p-2 rounded text-xs z-50">
          <div>Window size: {virtualWindowSize} days</div>
          <div>Window start: {virtualWindowStart.format("MM/DD")}</div>
          <div>
            Offset X: {Math.round(dayTranslateOffsetX)}px (
            {Math.floor(dayTranslateOffsetX / dayWidth)} days)
          </div>
          <div>Offset Y: {Math.round(dayTranslateOffsetY)}px</div>
          <div>Visible days: {visibleDaysRange}</div>
          <div>Date range: {actualDaysRange}</div>
          <div>View week start: {viewWeekStart.format("MM/DD")}</div>
        </div>
      )}
    </div>
  );
}
