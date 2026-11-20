import React, {
  useMemo,
  useState,
  useEffect,
  useEffectEvent,
  useRef,
  useCallback,
} from "react";
import dayjs, { weekdayZh } from "@/lib/dayjs";

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
// Height of the sticky day-name row; the time column and now-line offset by it
const DAY_HEADER_HEIGHT = 40;

const TIME_COLUMN_WIDTH = 80; // Width of the time column in pixels

// Touch: movement before a pan locks to one axis, flick projection, vertical momentum
const TOUCH_AXIS_LOCK_DISTANCE = 6;
const FLICK_PROJECTION_MS = 200;
const MOMENTUM_FRICTION = 0.95; // velocity kept per 16ms frame
const MOMENTUM_MIN_VELOCITY = 0.02; // px/ms

export interface WeekViewProps {
  /** Number of day columns that fit on screen (7, or 3 on phones) */
  visibleDays: number;
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
  const nowPosition = nowHourOffset * 60 + nowMinute + DAY_HEADER_HEIGHT; // Position of the current time in pixels

  return {
    now,
    nowHourOffset,
    nowPosition,
  };
}

export function WeekView({
  visibleDays,
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

  // Start highlighting as soon as a new highlightDate arrives (during render,
  // so there is no extra un-highlighted frame)
  const [prevHighlightDate, setPrevHighlightDate] = useState<Date | undefined>(undefined);
  if (highlightDate !== prevHighlightDate) {
    setPrevHighlightDate(highlightDate);
    if (highlightDate) {
      setIsHighlightActive(true);
      setCurrentHighlightDate(highlightDate);
    }
  }

  // Clear the highlight after a delay
  useEffect(() => {
    if (highlightDate) {
      const timer = setTimeout(() => {
        setIsHighlightActive(false);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [highlightDate]);

  const sessions = joinSessions(selectedSessions, previewSessions);

  // Initial virtual window settings
  const [virtualWindowSize, setVirtualWindowSize, virtualWindowSizeRef] = useStateRef(
    INITIAL_VIRTUAL_WINDOW_SIZE
  );
  const [virtualWindowStart, setVirtualWindowStart, virtualWindowStartRef] = useStateRef(
    viewWeekStart.subtract(INITIAL_VIRTUAL_WINDOW_SIZE / 2, "day")
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
    // visible days share the width left of the time column
    () => (weekviewWidth - timeColumnWidth) / visibleDays,
    [weekviewWidth, timeColumnWidth, visibleDays]
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
    visibleDays,
    setDayTranslateOffsetX,
    setDayTranslateOffsetY,
    setVirtualWindowStart,
  });

  const visibleDaysRange = useMemo(() => {
    const startIndex = Math.floor(dayTranslateOffsetX / dayWidth);
    return `${startIndex} to ${startIndex + visibleDays}`;
  }, [dayTranslateOffsetX, dayWidth, visibleDays]);

  const [visibleStartDay, visibleEndDay] = useMemo(() => {
    if (weekDays.length === 0) return [null, null];
    const startIndex = Math.floor(dayTranslateOffsetX / dayWidth);
    const endIndex = Math.min(startIndex + visibleDays, weekDays.length);

    if (startIndex >= weekDays.length || endIndex <= 0) {
      console.warn("Invalid day range");
      return [null, null];
    }

    const visibleStartDay = weekDays[Math.max(0, startIndex)];
    const visibleEndDay = weekDays[Math.min(endIndex - 1, weekDays.length - 1)];

    return [visibleStartDay, visibleEndDay] as const;
  }, [dayTranslateOffsetX, dayWidth, weekDays, visibleDays]);

  const actualDaysRange = useMemo(() => {
    if (!visibleStartDay || !visibleEndDay) return "";
    return `${visibleStartDay.format("MM/DD")} to ${visibleEndDay.format(
      "MM/DD"
    )}`;
  }, [visibleStartDay, visibleEndDay]);

  // Scroll to viewWeekStart once the grid has a width, and whenever it changes
  const hasLayout = dayWidth > 0;
  useEffect(() => {
    if (hasLayout && weekDays.length > 0) {
      // The scrollToTime function now handles cases where the day is outside the virtual window
      scrollToTime(viewWeekStart, false, "left");
    }
  // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [viewWeekStart, hasLayout]);

  // When columns change width (window resize, a panel opening or being dragged),
  // keep the same first visible day rather than jumping back to viewWeekStart,
  // which would undo a jump to a session.
  const prevDayWidthRef = useRef(dayWidth);
  useEffect(() => {
    const prevDayWidth = prevDayWidthRef.current;
    prevDayWidthRef.current = dayWidth;
    if (prevDayWidth > 0 && dayWidth > 0 && prevDayWidth !== dayWidth) {
      setDayTranslateOffsetX(Math.round(dayTranslateOffsetXRef.current / prevDayWidth) * dayWidth);
    }
  }, [dayWidth, setDayTranslateOffsetX, dayTranslateOffsetXRef]);

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
      
      // scrollToSession now handles cases where the session's day is outside the virtual window.
      // Afterwards, tell CalendarView which days are showing so its header follows.
      scrollToSession(targetSession).then(() => reportFirstVisibleDay());
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

  // Move the view by a scroll delta (wheel or touch), growing the virtual window
  // of days when an edge comes near and trimming it so it stays small.
  // Reads the *Ref values so several deltas within one frame accumulate.
  const scrollByDelta = useEffectEvent((deltaX: number, deltaY: number) => {
    if (deltaX !== 0 && dayWidth > 0) {
      const windowStart = virtualWindowStartRef.current;
      const windowSize = virtualWindowSizeRef.current;
      const newOffset = dayTranslateOffsetXRef.current + deltaX;
      setDayTranslateOffsetX(newOffset);

      // Calculate visible range in the virtual window
      const daysFromStart = Math.floor(newOffset / dayWidth);
      const daysFromEnd = windowSize - (daysFromStart + visibleDays);

      let newStart = windowStart;
      let offsetAdjustment = 0;
      let sizeAdjustment = 0;
      const daysToAdd = 7; // Extend a week at a time

      if (daysFromStart < extendThreshold) {
        // Approaching the start: prepend days
        newStart = windowStart.subtract(daysToAdd, "day");
        offsetAdjustment = daysToAdd * dayWidth;
        sizeAdjustment = daysToAdd;

        // Trim from the end if the window gets too large
        if (windowSize + daysToAdd > 30) {
          const daysToTrim = Math.min(daysToAdd, windowSize - (visibleDays + trimThreshold));
          sizeAdjustment = daysToAdd - daysToTrim;
        }
      } else if (daysFromEnd < extendThreshold) {
        // Approaching the end: append days
        sizeAdjustment = daysToAdd;

        // Trim from the start if the window gets too large, shifting the offset
        // so what the user is looking at stays put
        if (windowSize + daysToAdd > 30) {
          const daysToTrim = Math.min(daysToAdd, windowSize - (visibleDays + trimThreshold));
          newStart = windowStart.add(daysToTrim, "day");
          offsetAdjustment = -daysToTrim * dayWidth;
          sizeAdjustment = daysToAdd - daysToTrim;
        }
      }

      if (offsetAdjustment !== 0 || sizeAdjustment !== 0) {
        setVirtualWindowStart(newStart);
        setVirtualWindowSize(windowSize + sizeAdjustment);
        setDayTranslateOffsetX(dayTranslateOffsetXRef.current + offsetAdjustment);
      }
    }

    if (deltaY !== 0) {
      // Keep the vertical offset within the hours of the day
      const newOffsetY = dayTranslateOffsetYRef.current + deltaY;
      setDayTranslateOffsetY(Math.max(0, Math.min(newOffsetY, maxScrollY)));
    }
  });

  // Tell the parent which day is now the first column
  const reportFirstVisibleDay = useEffectEvent(() => {
    if (dayWidth <= 0) return;
    const index = Math.round(dayTranslateOffsetXRef.current / dayWidth);
    onWeekStartChange(virtualWindowStartRef.current.add(index, "day"));
  });

  // Snap to the nearest day column and report the new first visible day. A flick
  // (velocityX in px/ms) carries the snap further, up to one screen of days.
  const snapToDay = useEffectEvent((velocityX: number = 0) => {
    if (dayWidth <= 0) return;
    const offset = dayTranslateOffsetXRef.current;
    const current = Math.round(offset / dayWidth);
    const projected = Math.round((offset + velocityX * FLICK_PROJECTION_MS) / dayWidth);
    const target = Math.max(
      0,
      current - visibleDays,
      Math.min(projected, current + visibleDays, virtualWindowSizeRef.current - visibleDays),
    );

    setUseTransition(true);
    setDayTranslateOffsetX(target * dayWidth);
    setIsScrolling(false);
    reportFirstVisibleDay();
  });

  const momentumFrameRef = useRef<number | null>(null);
  const cancelMomentum = () => {
    if (momentumFrameRef.current !== null) {
      cancelAnimationFrame(momentumFrameRef.current);
      momentumFrameRef.current = null;
    }
  };

  // Keep a vertical touch pan gliding after the finger lifts
  const startVerticalMomentum = useEffectEvent((initialVelocity: number) => {
    let velocity = initialVelocity;
    let last = performance.now();
    const step = (now: number) => {
      const dt = now - last;
      last = now;
      scrollByDelta(0, velocity * dt);
      velocity *= Math.pow(MOMENTUM_FRICTION, dt / 16);
      momentumFrameRef.current =
        Math.abs(velocity) < MOMENTUM_MIN_VELOCITY ? null : requestAnimationFrame(step);
    };
    momentumFrameRef.current = requestAnimationFrame(step);
  });

  const handleWheel = useEffectEvent((e: WheelEvent) => {
    e.preventDefault();
    cancelMomentum();
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    if (!isScrolling) {
      setIsScrolling(true);
      setUseTransition(false);
    }

    scrollByDelta(e.deltaX, e.deltaY);

    // Snap once the wheel has been quiet for 50ms
    scrollTimeoutRef.current = setTimeout(() => snapToDay(), 50);
  });

  // One-finger pan, locked to whichever axis it starts moving along.
  // Taps never reach touchmove's preventDefault, so they still click sessions.
  const touchRef = useRef<{
    startX: number;
    startY: number;
    lastX: number;
    lastY: number;
    lastTime: number;
    axis: "x" | "y" | null;
    velocityX: number;
    velocityY: number;
  } | null>(null);

  const handleTouchStart = useEffectEvent((e: TouchEvent) => {
    cancelMomentum();
    if (e.touches.length !== 1) {
      touchRef.current = null;
      return;
    }
    const { clientX, clientY } = e.touches[0];
    touchRef.current = {
      startX: clientX,
      startY: clientY,
      lastX: clientX,
      lastY: clientY,
      lastTime: e.timeStamp,
      axis: null,
      velocityX: 0,
      velocityY: 0,
    };
    setUseTransition(false);
  });

  const handleTouchMove = useEffectEvent((e: TouchEvent) => {
    const touch = touchRef.current;
    if (!touch || e.touches.length !== 1) return;
    const { clientX, clientY } = e.touches[0];

    if (!touch.axis) {
      const dx = clientX - touch.startX;
      const dy = clientY - touch.startY;
      if (Math.hypot(dx, dy) < TOUCH_AXIS_LOCK_DISTANCE) return;
      touch.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
    }
    if (e.cancelable) e.preventDefault();

    // Finger moving left scrolls forward, like a positive wheel delta
    const dt = Math.max(1, e.timeStamp - touch.lastTime);
    const deltaX = touch.lastX - clientX;
    const deltaY = touch.lastY - clientY;
    if (touch.axis === "x") {
      scrollByDelta(deltaX, 0);
      touch.velocityX = 0.8 * (deltaX / dt) + 0.2 * touch.velocityX;
    } else {
      scrollByDelta(0, deltaY);
      touch.velocityY = 0.8 * (deltaY / dt) + 0.2 * touch.velocityY;
    }
    touch.lastX = clientX;
    touch.lastY = clientY;
    touch.lastTime = e.timeStamp;
  });

  const handleTouchEnd = useEffectEvent((e: TouchEvent) => {
    const touch = touchRef.current;
    touchRef.current = null;
    if (!touch?.axis) return;

    // A finger that paused before lifting has no flick
    const paused = e.timeStamp - touch.lastTime > 100;
    if (touch.axis === "x") {
      snapToDay(paused ? 0 : touch.velocityX);
    } else if (!paused && Math.abs(touch.velocityY) > MOMENTUM_MIN_VELOCITY) {
      startVerticalMomentum(touch.velocityY);
    }
  });

  // Listeners are attached natively (not via React props) so they can be
  // non-passive and call preventDefault. The handlers above always see fresh state.
  useEffect(() => {
    const element = weekViewRef.current;
    if (!element) return;

    const onWheel = (e: WheelEvent) => handleWheel(e);
    const onTouchStart = (e: TouchEvent) => handleTouchStart(e);
    const onTouchMove = (e: TouchEvent) => handleTouchMove(e);
    const onTouchEnd = (e: TouchEvent) => handleTouchEnd(e);
    const options = { passive: false };

    element.addEventListener("wheel", onWheel, options);
    element.addEventListener("touchstart", onTouchStart, options);
    element.addEventListener("touchmove", onTouchMove, options);
    element.addEventListener("touchend", onTouchEnd);
    element.addEventListener("touchcancel", onTouchEnd);
    return () => {
      element.removeEventListener("wheel", onWheel);
      element.removeEventListener("touchstart", onTouchStart);
      element.removeEventListener("touchmove", onTouchMove);
      element.removeEventListener("touchend", onTouchEnd);
      element.removeEventListener("touchcancel", onTouchEnd);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      if (momentumFrameRef.current !== null) {
        cancelAnimationFrame(momentumFrameRef.current);
      }
    };
  }, []);

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

  // Handle mouse move during selection. A selection stays on the day it started
  // on; every column shares the same vertical scale, so any column under the
  // pointer can update its end (the view may scroll or snap mid-drag).
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const posY = Math.max(0, Math.min(e.clientY - rect.top, rect.height));

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

  // The drag selection is drawn inside the day column it started in, so it moves
  // with that column (scrolling, snapping, resizing) without any position math.
  const selection =
    isDragging && dragStartDay && dragStartPos !== null && dragEndPos !== null
      ? {
          day: dragStartDay,
          top: Math.min(dragStartPos, dragEndPos),
          bottom: Math.max(dragStartPos, dragEndPos),
        }
      : null;

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

  return (
    <div
      // touch-none: WeekView handles one-finger pans itself (see handleTouchMove)
      className="relative overflow-hidden max-h-full touch-none overscroll-none"
      style={
        {
          "--day-width": `${dayWidth}px`,
          height: "calc(100dvh - 4rem)", // minus the h-16 calendar header
          display: "grid",
          gridTemplateColumns: `${timeColumnWidth}px repeat(${virtualWindowSize}, var(--day-width))`,
        } as React.CSSProperties
      }
      ref={weekViewRef}
      data-is-dragging={isDragging}
    >
      {/* Time Labels Column */}
      <div
        className="w-full bg-background pb-4 mb-4 z-10 md:px-4 px-1"
        style={{ paddingTop: DAY_HEADER_HEIGHT }}
      >
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
          className="absolute left-0 w-full h-px bg-brand z-10"
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
          <span className="absolute bg-brand text-brand-foreground text-xs px-1 rounded-b left-2">
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
                      "sticky top-0 z-10 flex items-center justify-center gap-1 border-b bg-background text-xs md:text-sm whitespace-nowrap select-none cursor-pointer hover:bg-muted transition-colors",
                      shouldHighlight && "bg-blue-100 dark:bg-blue-900/50"
                    )}
                    style={{ height: DAY_HEADER_HEIGHT }}
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
                      {weekdayZh(day)}
                    </span>{" "}
                    <span
                      className={cn("p-0.5", {
                        "bg-brand text-brand-foreground rounded": isSameDay,
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
                "relative h-[840px] border-b border-border",
                shouldHighlight && "bg-blue-50/70 dark:bg-blue-950/20"
              )}
              onMouseDown={(e) => handleMouseDown(e, day)}
              onMouseMove={handleMouseMove}
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

              {selection && selection.day.isSame(day, "day") && (
                <div
                  className="pointer-events-none absolute inset-x-0 z-30 border-2 border-blue-600 bg-blue-500/30 shadow-lg"
                  style={{ top: selection.top, height: selection.bottom - selection.top }}
                >
                  <div className="absolute -left-2 top-0 rounded-md bg-blue-600 px-2 py-1 text-xs text-white shadow-md">
                    {dayjs(positionToTime(selection.day, selection.top)).format("HH:mm")}
                  </div>
                  <div className="absolute -right-2 bottom-0 rounded-md bg-blue-600 px-2 py-1 text-xs text-white shadow-md">
                    {dayjs(positionToTime(selection.day, selection.bottom)).format("HH:mm")}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Debug info - shown only in development */}
      {process.env.NODE_ENV === "development" && (
        <div data-dev-overlay className="absolute bottom-2 right-2 bg-black/70 text-white p-2 rounded text-xs z-50">
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
