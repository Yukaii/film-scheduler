import React, { useState } from "react";
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
  const [selectedSessions, setSelectedSessions] = useState<Set<string>>(
    new Set(),
  );

  const onClose = () => setOpen(false);

  const toggleSessionSelection = (sessionId: string) => {
    setSelectedSessions((prev) => {
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
      setSelectedSessions(new Set(sessions.map((s) => generateSessionId(s))));
    } else {
      setSelectedSessions(new Set());
    }
  };

  const handleImport = () => {
    const selected = sessions.filter((session) =>
      selectedSessions.has(generateSessionId(session)),
    );
    onImport(selected);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>匯入場次</DialogTitle>
          <DialogDescription>
            找到了以下場次。請選擇你想匯入的場次。
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center sticky top-0">
            <Checkbox
              id="select-all"
              onCheckedChange={(checked) => selectAllSessions(Boolean(checked))}
              checked={selectedSessions.size === sessions.length}
            />
            <label htmlFor="select-all" className="ml-2">
              全選
            </label>
          </div>

          <div className="max-h-[320px] overflow-auto">
            {sessions.map((session) => {
              const film = filmsMap.get(session.filmId);
              const sessionId = generateSessionId(session);
              if (!film) return null;

              return (
                <div key={sessionId} className="flex items-center space-x-2">
                  <Checkbox
                    id={`checkbox-${sessionId}`}
                    onCheckedChange={() => toggleSessionSelection(sessionId)}
                    checked={selectedSessions.has(sessionId)}
                  />
                  <label htmlFor={`checkbox-${sessionId}`}>
                    {film.filmTitle} {session.location} -{" "}
                    {new Date(session.time).toLocaleString()}
                  </label>
                </div>
              );
            })}
          </div>
        </div>
        <DialogFooter>
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
