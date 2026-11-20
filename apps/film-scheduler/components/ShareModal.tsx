"use client";

import React, { useState, useMemo, useSyncExternalStore } from "react";
import { useCopyToClipboard } from "react-use";
import dayjs from "@/lib/dayjs";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { SessionsMiniPreview } from "@/components/SessionsMiniPreview";
import {
  generateShareableUrlWithSessionIds,
  generateCalendarICS,
} from "@/lib/utils";
import { Session, FilmsMap } from "@/components/types";
import { CalendarArrowDown, Check, ChevronDown, Copy, Share } from "lucide-react";
import { saveAs } from "file-saver";

interface ShareModalProps {
  sessions: Session[];
  open: boolean;
  setOpen: (open: boolean) => void;
  filmsMap: FilmsMap;
}

const noopSubscribe = () => () => {};

function SectionLabel({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  const className = "block text-xs font-medium text-muted-foreground";
  return htmlFor ? (
    <label htmlFor={htmlFor} className={className}>{children}</label>
  ) : (
    <p className={className}>{children}</p>
  );
}

export function ShareModal({
  sessions,
  open,
  setOpen,
  filmsMap,
}: ShareModalProps) {
  const [selectedSessionIds, setSelectedSessionIds] = useState<Set<string>>(
    new Set(),
  );
  const [copyState, copyToClipboard] = useCopyToClipboard();
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  // navigator.share never changes at runtime; false on the server
  const isNativeShareSupported = useSyncExternalStore(
    noopSubscribe,
    () => !!navigator.share,
    () => false,
  );

  // Select every session each time the modal opens (or the sessions change while open)
  const [syncedWith, setSyncedWith] = useState<{ open: boolean; sessions: Session[] } | null>(null);
  if (syncedWith?.open !== open || syncedWith.sessions !== sessions) {
    setSyncedWith({ open, sessions });
    if (open) {
      setSelectedSessionIds(new Set(sessions.map((s) => s.id)));
      setCopied(false);
    }
  }

  const sortedSessions = useMemo(
    () => [...sessions].sort((a, b) => a.time - b.time),
    [sessions],
  );

  const toggleSessionSelection = (sessionId: string) => {
    setSelectedSessionIds((prev) => {
      const updated = new Set(prev);
      if (updated.has(sessionId)) {
        updated.delete(sessionId);
      } else {
        updated.add(sessionId);
      }
      return updated;
    });
    setCopied(false);
  };

  const selectAllSessions = (isSelected: boolean) => {
    setSelectedSessionIds(isSelected ? new Set(sessions.map((s) => s.id)) : new Set());
    setCopied(false);
  };

  const selectedSessions = useMemo(
    () => sortedSessions.filter((session) => selectedSessionIds.has(session.id)),
    [selectedSessionIds, sortedSessions],
  );

  const shareUrl = useMemo(() => {
    if (typeof window !== "undefined") {
      return generateShareableUrlWithSessionIds(selectedSessions);
    }
    return "";
  }, [selectedSessions]);

  const hasSelection = selectedSessions.length > 0;
  const allSelected = sessions.length > 0 && selectedSessionIds.size === sessions.length;

  const handleCopy = () => {
    copyToClipboard(shareUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadICS = async () => {
    generateCalendarICS(selectedSessions, filmsMap)
      .then((icsContent) => {
        if (icsContent) {
          const blob = new Blob([icsContent], { type: "text/calendar" });
          saveAs(blob, "film_schedule.ics");
        }
      })
      .catch((error) => console.error("Error creating calendar:", error));
  };

  const handleNativeShare = async () => {
    try {
      await navigator.share({ title: "我的觀影片單", url: shareUrl });
    } catch (error) {
      // AbortError = the user closed the share sheet
      if ((error as Error).name !== "AbortError") console.error("Error sharing:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="flex max-h-[85dvh] flex-col gap-0 p-0 sm:max-w-md">
        <DialogHeader className="space-y-1 px-6 pb-4 pt-6 text-left">
          <DialogTitle>分享片單</DialogTitle>
          <DialogDescription>
            把選好的場次傳給朋友，或匯入你的行事曆。
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 pb-6">
          {/* 1. What is being shared */}
          <Collapsible open={isExpanded} onOpenChange={setIsExpanded} className="space-y-2">
            <SectionLabel>場次</SectionLabel>
            <div className="flex items-center justify-between rounded-lg border px-3 py-2.5">
              <p className="text-sm">
                已選{" "}
                <span className="font-semibold tabular-nums">{selectedSessions.length}</span>
                <span className="text-muted-foreground tabular-nums"> / {sessions.length}</span> 場
              </p>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="-mr-2 h-7 gap-1 text-muted-foreground">
                  {isExpanded ? "收合" : "選擇"}
                  <ChevronDown className={isExpanded ? "rotate-180 transition-transform" : "transition-transform"} />
                </Button>
              </CollapsibleTrigger>
            </div>

            <CollapsibleContent className="space-y-3">
              <SessionsMiniPreview
                sessions={sortedSessions}
                selectedSessionIds={selectedSessionIds}
                onSelectSession={toggleSessionSelection}
              />

              <div className="rounded-lg border">
                <div className="flex items-center gap-3 border-b px-3 py-2">
                  <Checkbox
                    id="share-select-all"
                    checked={allSelected}
                    onCheckedChange={(checked) => selectAllSessions(checked === true)}
                  />
                  <label htmlFor="share-select-all" className="flex-1 cursor-pointer text-sm font-medium">
                    全選
                  </label>
                </div>
                <ul className="max-h-56 overflow-y-auto py-1">
                  {sortedSessions.map((session) => {
                    const film = filmsMap.get(session.filmId);
                    if (!film) return null;
                    return (
                      <li key={session.id}>
                        <div className="flex items-center gap-3 px-3 py-1.5 hover:bg-muted/50">
                          <Checkbox
                            id={`share-${session.id}`}
                            checked={selectedSessionIds.has(session.id)}
                            onCheckedChange={() => toggleSessionSelection(session.id)}
                          />
                          <label htmlFor={`share-${session.id}`} className="min-w-0 flex-1 cursor-pointer">
                            <span className="block truncate text-sm">{film.filmTitle}</span>
                            <span className="block truncate text-xs text-muted-foreground">
                              <span className="tabular-nums">{dayjs(session.time).format("MM/DD HH:mm")}</span>
                              {" · "}
                              {session.location}
                            </span>
                          </label>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* 2. The link */}
          <div className="space-y-2">
            <SectionLabel htmlFor="share-url">分享連結</SectionLabel>
            <div className="flex gap-2">
              <Input
                id="share-url"
                value={hasSelection ? shareUrl : ""}
                placeholder="請至少選擇一個場次"
                readOnly
                onFocus={(e) => e.currentTarget.select()}
                className="min-w-0 flex-1 font-mono text-xs text-muted-foreground"
              />
              <Button
                variant="outline"
                onClick={handleCopy}
                disabled={!hasSelection}
                className="w-24 shrink-0"
                aria-live="polite"
              >
                {copied && !copyState.error ? (
                  <>
                    <Check className="text-green-600" />
                    已複製
                  </>
                ) : (
                  <>
                    <Copy />
                    複製
                  </>
                )}
              </Button>
            </div>
            {copyState.error && (
              <p className="text-xs text-destructive">無法複製：{copyState.error.message}</p>
            )}
          </div>
        </div>

        {/* 3. Actions */}
        <div className="flex flex-col-reverse gap-2 border-t bg-muted/30 px-6 py-4 sm:flex-row sm:justify-end sm:rounded-b-lg">
          {isNativeShareSupported && (
            <Button variant="outline" onClick={handleNativeShare} disabled={!hasSelection}>
              <Share />
              分享…
            </Button>
          )}
          <Button onClick={handleDownloadICS} disabled={!hasSelection}>
            <CalendarArrowDown />
            下載行事曆 (.ics)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
