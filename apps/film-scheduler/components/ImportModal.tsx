import React, { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { SessionsMiniPreview } from "@/components/SessionsMiniPreview";
import { Session, FilmsMap } from "@/components/types";
import { generateSessionId } from "@/lib/utils";

interface ImportModalProps {
  sessions: Session[];
  open: boolean;
  onImport: (sessions: Session[]) => void;
  filmsMap: FilmsMap;
  setOpen: (open: boolean) => void;
}

export function ImportModal({
  sessions,
  open,
  onImport,
  filmsMap,
  setOpen,
}: ImportModalProps) {
  const [selectedSessionIds, setSelectedSessionIds] = useState<Set<string>>(
    new Set(),
  );

  const onClose = () => setOpen(false);

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
      setSelectedSessionIds(new Set(sessions.map((s) => generateSessionId(s))));
    } else {
      setSelectedSessionIds(new Set());
    }
  };

  const selectedSessions = useMemo(() => {
    return sessions.filter((session) =>
      selectedSessionIds.has(generateSessionId(session)),
    );
  }, [selectedSessionIds]);

  const handleImport = () => {
    onImport(selectedSessions);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[85%] grid-rows-[auto_1fr_auto]">
        <DialogHeader className="sticky top-0 bg-background">
          <DialogTitle>匯入場次</DialogTitle>
          <DialogDescription>
            找到了以下場次。請選擇你想匯入的場次。
            <div className="flex items-center mt-2">
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
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 overflow-auto">
          <SessionsMiniPreview
            sessions={sessions}
            selectedSessionIds={selectedSessionIds}
            onSelectSession={toggleSessionSelection}
          />

          {sessions.map((session) => {
            const film = filmsMap.get(session.filmId);
            const sessionId = generateSessionId(session);
            if (!film) return null;

            return (
              <div key={sessionId} className="flex items-center space-x-2">
                <Checkbox
                  id={`checkbox-${sessionId}`}
                  onCheckedChange={() => toggleSessionSelection(sessionId)}
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

        <DialogFooter className="gap-2">
          <Button variant="secondary" onClick={onClose}>
            取消
          </Button>
          <Button variant="default" onClick={handleImport}>
            匯入選擇的場次
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
