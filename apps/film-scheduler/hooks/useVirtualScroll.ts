import { useCallback } from "react";
import dayjs from "@/lib/dayjs";
import { Session } from "@/components/types";

interface UseVirtualScrollParams {
  weekDays: dayjs.Dayjs[];
  dayWidth: number;
  virtualWindowSize: number;
  weekviewRect: DOMRect | null;
  startHour: number;
  maxScrollY?: number; // Add maxScrollY as an optional parameter
  setDayTranslateOffsetX: (value: number) => void;
  setDayTranslateOffsetY: (value: number) => void;
  setVirtualWindowStart: (value: dayjs.Dayjs) => void;
}

export function useVirtualScroll({
  weekDays,
  dayWidth,
  virtualWindowSize,
  weekviewRect,
  startHour,
  maxScrollY,
  setDayTranslateOffsetX,
  setDayTranslateOffsetY,
  setVirtualWindowStart,
}: UseVirtualScrollParams) {
  
  /**
   * Calculate the position in pixels for a given time
   */
  const calculateTimePosition = useCallback((time: dayjs.Dayjs) => {
    const hour = time.hour();
    const minute = time.minute();
    const hourOffset = hour - startHour;
    return hourOffset * 60 + minute;
  }, [startHour]);

  /**
   * Scroll to a specific date and time
   */
  const scrollToTime = useCallback((targetDate: dayjs.Dayjs, alignment: "center" | "left" | "right" = "center") => {
    // Find the day in the virtual window
    const targetDayIndex = weekDays.findIndex((day) =>
      day.isSame(targetDate, "day")
    );

    const visibleHeight = weekviewRect?.height || 600;
    const timePosition = calculateTimePosition(targetDate);
    
    if (targetDayIndex !== -1) {
      // Target day is in the current virtual window - scroll to it
      // Calculate horizontal offset to center the day
      let newHorizontalOffset = 0;
      switch (alignment) {
        case "left":
          newHorizontalOffset = targetDayIndex * dayWidth;
          break;
        case "right":
          newHorizontalOffset = (targetDayIndex + 1) * dayWidth;
          break;
        case "center":
        default:
          newHorizontalOffset = (targetDayIndex - 3) * dayWidth; // Center it with a few days before
          break;
      }
      
      setDayTranslateOffsetX(newHorizontalOffset);

      // Calculate vertical offset to position the time in the middle
      let newVerticalOffset = Math.max(
        0,
        timePosition - visibleHeight / 2 + 60
      );
      
      // Respect maxScrollY if provided
      if (maxScrollY !== undefined) {
        newVerticalOffset = Math.min(newVerticalOffset, maxScrollY);
      }
      
      setDayTranslateOffsetY(newVerticalOffset);
      
      return true;
    } else {
      // Target day is not in the current virtual window - adjust the window first
      // Recenter the virtual window around the target date
      const newStart = targetDate.subtract(Math.floor(virtualWindowSize / 2), "day");
      setVirtualWindowStart(newStart);
      
      // Reset the offset to center the day in view
      const targetIndex = Math.floor(virtualWindowSize / 2);
      const newHorizontalOffset = (targetIndex - 3) * dayWidth;
      
      // Apply new position with slight delay to allow window update
      setTimeout(() => {
        setDayTranslateOffsetX(newHorizontalOffset);
        
        // Set vertical offset to show the time
        let newVerticalOffset = Math.max(
          0,
          timePosition - visibleHeight / 2 + 60
        );
        
        // Respect maxScrollY if provided
        if (maxScrollY !== undefined) {
          newVerticalOffset = Math.min(newVerticalOffset, maxScrollY);
        }
        
        setDayTranslateOffsetY(newVerticalOffset);
      }, 50);
      
      return false;
    }
  }, [
    weekDays,
    dayWidth,
    virtualWindowSize,
    weekviewRect,
    calculateTimePosition,
    maxScrollY, // Add maxScrollY to dependencies
    setDayTranslateOffsetX,
    setDayTranslateOffsetY,
    setVirtualWindowStart,
  ]);

  /**
   * Scroll to a specific session
   */
  const scrollToSession = useCallback((session: Session) => {
    const sessionDate = dayjs(session.time);
    return scrollToTime(sessionDate);
  }, [scrollToTime]);

  /**
   * Scroll to the current time
   */
  const scrollToNow = useCallback(() => {
    const now = dayjs();
    return scrollToTime(now);
  }, [scrollToTime]);

  return {
    scrollToTime,
    scrollToSession,
    scrollToNow,
    calculateTimePosition,
  };
}