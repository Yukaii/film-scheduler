"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useCopyToClipboard } from "react-use";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
import { ChevronDown, Share, CalendarArrowDown, ClipboardCopy } from "lucide-react";
import { saveAs } from "file-saver";

interface ShareModalProps {
  sessions: Session[];
  open: boolean;
  setOpen: (open: boolean) => void;
  filmsMap: FilmsMap;
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
  const [state, copyToClipboard] = useCopyToClipboard();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isNativeShareSupported, setIsNativeShareSupported] = useState(false);

  useEffect(() => {
    setIsNativeShareSupported(
      typeof navigator !== "undefined" && !!navigator.share
    );
  }, []);

  const onClose = () => setOpen(false);

  useEffect(() => {
    if (open) {
      setSelectedSessionIds(new Set(sessions.map((s) => s.id)));
    }
  }, [open, sessions]);

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
  };

  const selectAllSessions = (isSelected?: boolean) => {
    if (isSelected) {
      setSelectedSessionIds(new Set(sessions.map((s) => s.id)));
    } else {
      setSelectedSessionIds(new Set());
    }
  };

  const selectedSessions = useMemo(() => {
    return sessions.filter((session) =>
      selectedSessionIds.has(session.id),
    );
  }, [selectedSessionIds, sessions]);

  const shareUrl = useMemo(() => {
    if (typeof window !== "undefined") {
      return generateShareableUrlWithSessionIds(selectedSessions);
    }
    return "";
  }, [selectedSessions]);

  // Function to generate ICS file
  const handleDownloadICS = async () => {
    generateCalendarICS(selectedSessions, filmsMap)
      .then((icsContent) => {
        if (icsContent) {
          const blob = new Blob([icsContent], { type: "text/calendar" });
          saveAs(blob, "Golden_Horse_Film_Schedule.ics");
        }
      })
      .catch((error) => console.error("Error creating calendar:", error));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[85%] grid-rows-[auto_1fr_auto]">
        <DialogHeader className="sticky top-0 bg-background">
          <DialogTitle>分享你的場次</DialogTitle>
          <DialogDescription>
            請選擇您想分享的場次並複製生成的連結或下載 ICS 檔案。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 overflow-auto">
          <Collapsible
            open={isExpanded}
            onOpenChange={setIsExpanded}
            className="mb-2"
          >
            <CollapsibleTrigger asChild>
              <Button
                variant="outline"
                className="w-full flex items-center justify-between"
              >
                展開預覽以選擇場次
                <ChevronDown
                  className={`ml-2 ${isExpanded ? "rotate-180" : ""}`}
                />
              </Button>
            </CollapsibleTrigger>

            <CollapsibleContent>
              <div className="p-2">
                <div className="flex items-center mb-2">
                  <Checkbox
                    id="select-all"
                    onCheckedChange={(checked) =>
                      selectAllSessions(Boolean(checked))
                    }
                    checked={selectedSessionIds.size === sessions.length}
                  />
                  <label htmlFor="select-all" className="ml-2">
                    全選
                  </label>
                </div>

                <SessionsMiniPreview
                  sessions={sessions}
                  selectedSessionIds={selectedSessionIds}
                  onSelectSession={toggleSessionSelection}
                />

                {sessions.map((session) => {
                  const film = filmsMap.get(session.filmId);
                  const sessionId = session.id;
                  if (!film) return null;

                  return (
                    <div
                      key={sessionId}
                      className="flex items-center space-x-2 mt-1"
                    >
                      <Checkbox
                        id={`checkbox-${sessionId}`}
                        onCheckedChange={() =>
                          toggleSessionSelection(sessionId)
                        }
                        checked={selectedSessionIds.has(sessionId)}
                      />
                      <label htmlFor={`checkbox-${sessionId}`}>
                        {film.filmTitle} {session.location} -{" "}
                        {new Date(session.time).toLocaleString()}
                      </label>
                    </div>
                  );
                })}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Input value={shareUrl} readOnly className="flex-grow" />
            <Button variant="default" onClick={() => copyToClipboard(shareUrl)}>
              <ClipboardCopy className="mr-1" />
              複製到剪貼簿
            </Button>
          </div>
          
          <DialogFooter className="flex flex-wrap gap-2 justify-end">
            {isNativeShareSupported && (
              <Button
                variant="default"
                className="flex-1 sm:flex-none"
                onClick={async () => {
                  try {
                    const shareData: ShareData = {
                      title: "金馬影展場次分享",
                      text: "我選的金馬影展場次",
                      url: shareUrl,
                    };
                    await navigator.share(shareData);
                  } catch (error) {
                    console.error("Error sharing:", error);
                  }
                }}
              >
                <Share className="mr-1" />
                分享
              </Button>
            )}
            <Button 
              variant="default" 
              className="flex-1 sm:flex-none"
              onClick={handleDownloadICS}
            >
              <CalendarArrowDown className="mr-1" />
              下載 ICS
            </Button>
            <Button 
              variant="secondary" 
              className="flex-1 sm:flex-none"
              onClick={onClose}
            >
              關閉
            </Button>
          </DialogFooter>
        </div>

        <div>
          {state.error ? (
            <p className="text-red-500">無法複製值: {state.error.message}</p>
          ) : (
            state.value && <p className="text-green-500">已複製到剪貼簿！</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
