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
   * Check if a date is within the current virtual window
   * @returns The index of the day if found, or -1 if not in the window
   */
  const isDateInVirtualWindow = useCallback((targetDate: dayjs.Dayjs): number => {
    if (!weekDays.length) return -1;
    
    return weekDays.findIndex((day) => day.isSame(targetDate, "day"));
  }, [weekDays]);

  /**
   * Adjust the virtual window to include the target date
   */
  const adjustVirtualWindowForDate = useCallback((targetDate: dayjs.Dayjs): Promise<void> => {
    // Center the virtual window around the target date
    const newStart = targetDate.subtract(Math.floor(virtualWindowSize / 2), "day");
    
    return new Promise((resolve) => {
      setVirtualWindowStart(newStart);
      // Allow time for the window update to take effect
      setTimeout(resolve, 50);
    });
  }, [virtualWindowSize, setVirtualWindowStart]);

  /**
   * Check if a date is visible in the current view (not just in virtual window)
   * If not, prepare the virtual window to make it visible
   * @returns An object with the day index and whether the window was adjusted
   */
  const ensureDateIsVisible = useCallback(async (
    targetDate: dayjs.Dayjs
  ): Promise<{ dayIndex: number; windowAdjusted: boolean }> => {
    // First check if the target day is in the current virtual window
    let targetDayIndex = isDateInVirtualWindow(targetDate);
    let windowAdjusted = false;
    
    // If the day is not in the current window, adjust the window
    if (targetDayIndex === -1) {
      await adjustVirtualWindowForDate(targetDate);
      windowAdjusted = true;
      
      // After window adjustment, find the new index
      // It should be roughly in the middle of the window
      targetDayIndex = Math.floor(virtualWindowSize / 2);
    }
    
    return { dayIndex: targetDayIndex, windowAdjusted };
  }, [isDateInVirtualWindow, adjustVirtualWindowForDate, virtualWindowSize]);

  /**
   * Scroll to a specific date and time
   */
  const scrollToTime = useCallback(async (targetDate: dayjs.Dayjs, adjustY = true, alignment: "center" | "left" | "right" = "center") => {
    const visibleHeight = weekviewRect?.height || 600;
    const timePosition = calculateTimePosition(targetDate);
    
    // Ensure the target date is visible
    const { dayIndex: targetDayIndex, windowAdjusted } = await ensureDateIsVisible(targetDate);
    
    // Calculate the new horizontal offset based on alignment
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
        newHorizontalOffset = (targetDayIndex - 3) * dayWidth; // Center with days before
        break;
    }
    
    // Apply horizontal offset
    setDayTranslateOffsetX(newHorizontalOffset);

    if (!adjustY) return { success: true, windowAdjusted };

    // Set vertical scroll position
    let newVerticalOffset = Math.max(
      0,
      timePosition - visibleHeight / 2 + 60
    );
    
    // Respect maxScrollY if provided
    if (maxScrollY !== undefined) {
      newVerticalOffset = Math.min(newVerticalOffset, maxScrollY);
    }
    
    setDayTranslateOffsetY(newVerticalOffset);
    
    return { success: true, windowAdjusted };
  }, [
    weekviewRect,
    calculateTimePosition,
    ensureDateIsVisible,
    dayWidth,
    maxScrollY,
    setDayTranslateOffsetX,
    setDayTranslateOffsetY,
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
    isDateInVirtualWindow,
    ensureDateIsVisible,
  };
}