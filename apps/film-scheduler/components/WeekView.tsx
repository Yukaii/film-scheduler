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
import { SessionBlock } from "./SessionBlock";

// Thresholds for extending virtual window (in days)
const extendThreshold = 3; // Extend when we're within 3 days of an edge
const trimThreshold = 7; // Keep at least 7 days on each side after trimming

const startHour = 10;
const hoursInDay = 14;

const INITIAL_VIRTUAL_WINDOW_SIZE = 28; // Initial size of the virtual window in days

export interface WeekViewProps {
  initialWeekStart: dayjs.Dayjs;
  selectedSessions: Session[];
  previewSessions: Session[];
  onWeekStartChange: (date: dayjs.Dayjs) => void;
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
  initialWeekStart,
  selectedSessions,
  previewSessions,
}: // onWeekStartChange,
WeekViewProps) {
  const {
    filmsMap,
    addSession,
    removeSession,
    revealFilmDetail,
    viewingFilmId,
    setTimeSelection,
  } = useAppContext();
  const { nowPosition, now, nowHourOffset } = useNowIndicator();

  const sessions = joinSessions(selectedSessions, previewSessions);

  // Initial virtual window settings
  const [virtualWindowSize, setVirtualWindowSize] = useState(
    INITIAL_VIRTUAL_WINDOW_SIZE
  );
  const [virtualWindowStart, setVirtualWindowStart] = useState(
    initialWeekStart.subtract(virtualWindowSize / 2, "day")
  );

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
    () => weekviewWidth / 8, // days + time column
    [weekviewWidth]
  );

  // Initialize dayTranslateOffset based on today's date
  const [dayTranslateOffsetX, setDayTranslateOffsetX, dayTranslateOffsetXRef] =
    useStateRef<number>(0);

  // Add a new state for vertical scrolling
  const [dayTranslateOffsetY, setDayTranslateOffsetY, dayTranslateOffsetYRef] =
    useStateRef<number>(0);

  // Event listener for virtual scrolling to a specific session
  useEffect(() => {
    const handleVirtualScrollToSession = (
      event: CustomEvent<VirtualScrollToSessionEvent>
    ) => {
      const { date, sessionId } = event.detail;

      // Find the day in the virtual window
      const targetDayIndex = weekDays.findIndex((day) =>
        day.isSame(date, "day")
      );

      if (targetDayIndex !== -1) {
        // Calculate the new horizontal offset to center the day
        const newHorizontalOffset = (targetDayIndex - 3) * dayWidth; // Center it with a few days before
        setDayTranslateOffsetX(newHorizontalOffset);

        // Find the session element to determine vertical position
        setTimeout(() => {
          const sessionElement = document.getElementById(sessionId);
          if (sessionElement) {
            // Get top position and calculate vertical offset
            const sessionTop = parseInt(sessionElement.style.top);

            // Calculate vertical offset to position the session in the middle of the visible area
            const visibleHeight = weekviewRect?.height || 600;
            const newVerticalOffset = Math.max(
              0,
              sessionTop - visibleHeight / 2 + 60
            );

            setDayTranslateOffsetY(newVerticalOffset);
          }
        }, 100); // Small delay to ensure DOM is updated
      }
    };

    // Event listener for scrolling to the current time indicator
    const handleVirtualScrollToNow = () => {
      const today = dayjs();
      
      // Find today's index in the virtual window
      const todayIndex = weekDays.findIndex((day) => 
        day.isSame(today, "day")
      );

      if (todayIndex !== -1) {
        // Today is in the current virtual window - scroll to it
        // Calculate the new horizontal offset to center today
        const newHorizontalOffset = (todayIndex - 3) * dayWidth; // Center it with a few days before
        setDayTranslateOffsetX(newHorizontalOffset);

        // Calculate vertical offset to show current time
        // Position the now indicator in the middle of the visible area
        const visibleHeight = weekviewRect?.height || 600;
        const newVerticalOffset = Math.max(0, nowPosition - visibleHeight / 2);

        setDayTranslateOffsetY(newVerticalOffset);
      } else {
        // Today is not in the current virtual window - need to adjust the window first
        // Recenter the virtual window around today
        const newStart = today.subtract(Math.floor(virtualWindowSize / 2), "day");
        setVirtualWindowStart(newStart);
        
        // Reset the offset to center today in view
        // Today will be at index 'virtualWindowSize/2' in the new window
        const targetIndex = Math.floor(virtualWindowSize / 2);
        const newHorizontalOffset = (targetIndex - 3) * dayWidth;
        
        // Apply new position with slight delay to allow window update
        setTimeout(() => {
          setDayTranslateOffsetX(newHorizontalOffset);
          
          // Set vertical offset to show current time
          const visibleHeight = weekviewRect?.height || 600;
          const newVerticalOffset = Math.max(0, nowPosition - visibleHeight / 2);
          setDayTranslateOffsetY(newVerticalOffset);
        }, 50);
      }
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
  }, [
    weekDays,
    dayWidth,
    setDayTranslateOffsetX,
    setDayTranslateOffsetY,
    weekviewRect,
    nowPosition,
    virtualWindowSize,
  ]);

  const maxScrollY = useMemo(
    () => (hoursInDay + 1) * 60 - (weekviewRect?.height || 300),
    [weekviewRect]
  );

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
        }
      }, 50); // 150ms delay to detect end of scroll

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
  ]);

  // Helper function to convert screen position to time
  const positionToTime = useCallback(
    (day: dayjs.Dayjs, posY: number): Date => {
      // Adjust posY by the vertical offset to get accurate time
      const adjustedPosY = posY + dayTranslateOffsetY;
      const hourOffset = Math.floor(adjustedPosY / 60);
      const minuteOffset = Math.round((adjustedPosY % 60) / 5) * 5; // Round to nearest 5 min
      return day
        .hour(startHour + hourOffset)
        .minute(minuteOffset)
        .toDate();
    },
    [dayTranslateOffsetY]
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

    const minDayIndex = Math.min(startDayIndex, endDayIndex);
    const maxDayIndex = Math.max(startDayIndex, endDayIndex);

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
      // top: `${minPosY - dayTranslateOffsetY}px`, // No offset adjustment needed since mouse positions are already relative to visible area
      height: `${maxPosY - minPosY}px`,
      width: (maxDayIndex - minDayIndex + 1) * dayWidth + "px",
      left: (minDayIndex - dayOffset + 1) * dayWidth + "px",
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

  return (
    <div
      className="relative overflow-hidden max-h-full"
      style={
        {
          "--day-width": `${dayWidth}px`,
          height: "calc(100vh - 68px)",
          display: "grid",
          gridTemplateColumns: `var(--day-width) repeat(${virtualWindowSize}, var(--day-width))`,
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

        return (
          <div
            key={day.format("YYYY-MM-DD")}
            className="w-full pb-4 bg-background mb-4 relative group/day"
            style={{
              transform: `translateX(${-dayTranslateOffsetX}px)`,
              transition: useTransition ? "transform 0.3s ease-out" : "none",
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
        </div>
      )}
    </div>
  );
}
