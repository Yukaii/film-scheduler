"use client";

import React, { useRef } from "react";
import { cn } from "@/lib/utils";

const KEYBOARD_STEP = 16;

export type ResizeHandleProps = {
  /** Which edge of the panel the handle sits on. A handle on the right edge grows the panel when dragged right. */
  edge: "left" | "right";
  width: number;
  minWidth: number;
  maxWidth: number;
  onResize: (width: number) => void;
  /** Double-click (or Enter) restores the default width. */
  onReset: () => void;
  label: string;
  className?: string;
};

// Matches the 45vw cap in panelWidthCss, so dragging stops where the panel stops growing
const MAX_VIEWPORT_SHARE = 0.45;

/**
 * Vertical drag handle for resizing a side panel. Pointer drag, arrow keys and
 * double-click-to-reset. While dragging, `data-resizing` on <html> disables
 * transitions and text selection page-wide (see globals.css).
 */
export function ResizeHandle({
  edge,
  width,
  minWidth,
  maxWidth,
  onResize,
  onReset,
  label,
  className,
}: ResizeHandleProps) {
  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null);

  const clamp = (value: number) => {
    const max = Math.min(maxWidth, window.innerWidth * MAX_VIEWPORT_SHARE);
    return Math.round(Math.min(Math.max(value, minWidth), Math.max(minWidth, max)));
  };

  const endDrag = () => {
    dragRef.current = null;
    delete document.documentElement.dataset.resizing;
  };

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      aria-valuenow={width}
      aria-valuemin={minWidth}
      aria-valuemax={maxWidth}
      tabIndex={0}
      title="拖曳調整寬度，雙擊還原"
      className={cn(
        "group/resize absolute inset-y-0 z-30 hidden w-2 cursor-col-resize touch-none outline-hidden md:block",
        edge === "right" ? "-right-1" : "-left-1",
        className,
      )}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        dragRef.current = { startX: e.clientX, startWidth: width };
        document.documentElement.dataset.resizing = "true";
      }}
      onPointerMove={(e) => {
        const drag = dragRef.current;
        if (!drag) return;
        const delta = e.clientX - drag.startX;
        onResize(clamp(drag.startWidth + (edge === "right" ? delta : -delta)));
      }}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onLostPointerCapture={endDrag}
      onDoubleClick={onReset}
      onKeyDown={(e) => {
        // Arrow keys move the edge in that direction
        const grow = edge === "right" ? "ArrowRight" : "ArrowLeft";
        const shrink = edge === "right" ? "ArrowLeft" : "ArrowRight";
        if (e.key === grow || e.key === shrink) {
          e.preventDefault();
          onResize(clamp(width + (e.key === grow ? KEYBOARD_STEP : -KEYBOARD_STEP)));
        } else if (e.key === "Enter") {
          e.preventDefault();
          onReset();
        }
      }}
    >
      {/* Visible line: appears on hover, focus and while dragging */}
      <div
        className={cn(
          "absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-transparent transition-colors",
          "group-hover/resize:bg-sidebar-ring group-focus-visible/resize:bg-sidebar-ring group-active/resize:bg-sidebar-ring",
        )}
      />
    </div>
  );
}
