import { Film, Session } from "./types";
import {
  cn,
  findSessionIndex,
  getSessionDuration,
  includesSession,
} from "@/lib/utils";
import dayjs from "@/lib/dayjs";
import { X } from "lucide-react";

export interface SessionBlockProps {
  session: Session;
  filmsMap: Map<string, Film>;
  selectedSessions: Session[];
  previewSessions: Session[];
  viewingFilmId: string | undefined;
  startHour: number;
  addSession: (session: Session) => void;
  removeSession: (session: Session) => void;
  revealFilmDetail: (film: Film) => void;
  sessions: Session[];
}

export function SessionBlock({
  session,
  filmsMap,
  selectedSessions,
  previewSessions,
  viewingFilmId,
  startHour,
  addSession,
  sessions,
  removeSession,
  revealFilmDetail,
}: SessionBlockProps) {
  const film = filmsMap.get(session.filmId);
  if (!film) return null;

  const sessionId = session.id;

  const startTime = dayjs(session.time);
  const endTime = startTime.add(film.duration, "minute");
  const startHourOffset = startTime.hour() - startHour;
  const startMinute = startTime.minute();
  const top = startHourOffset * 60 + startMinute;
  const isTinyCard = film.duration <= 25;

  let height: number;
  if (viewingFilmId === session.filmId && film.duration < 60) {
    height = 60;
  } else {
    height = isTinyCard ? 25 : film.duration;
  }

  const overlappingSessions = sessions
    .filter((s) => {
      const targetSessionFilm = filmsMap.get(s.filmId);
      if (!targetSessionFilm) return false;

      const targetStartTime = dayjs(s.time);
      const targetEndTime = dayjs(s.time).add(
        targetSessionFilm.duration,
        "minute"
      );

      return (
        targetStartTime.isSame(startTime, "day") &&
        (targetStartTime.isBetween(startTime, endTime, null, "[]") ||
          targetEndTime.isBetween(startTime, endTime, null, "[]"))
      );
    })
    .sort(
      (a, b) =>
        getSessionDuration(a, filmsMap) - getSessionDuration(b, filmsMap)
    );

  const overlappedIndex = findSessionIndex(overlappingSessions, session);
  const offset = (overlappedIndex + 1) * 10;
  const width = `calc(100% - ${offset + 10}px)`;
  const left = `${10 + offset}px`;

  const isSelectedSession = includesSession(selectedSessions, session);
  const isPreviewSession = includesSession(previewSessions, session);

  const zIndex = viewingFilmId === session.filmId ? 5 : 4 - overlappedIndex;

  return (
    <div
      id={sessionId}
      key={sessionId}
      className={cn(
        "absolute max-w-[calc(100%-10px)] text-white rounded shadow transition-opacity duration-200 hover:opacity-100",
        "border-4 border-solid border-transparent overflow-hidden group/sessionblock",
        "select-none session-block",
        {
          "opacity-70 hover:cursor-zoom-in bg-slate-600 dark:bg-slate-800 border-slate-600 dark:border-slate-800":
            !isSelectedSession,
          "opacity-100 dark:bg-violet-900 bg-violet-500 dark:hover:border-white cursor-pointer hover:border-violet-700":
            isSelectedSession,
          "p-0": isTinyCard,
          "p-1": !isTinyCard,
        }
      )}
      onClick={() => {
        if (isPreviewSession) {
          addSession(session);
        }
        if (isSelectedSession) {
          revealFilmDetail(film);
        }
      }}
      style={{
        top: `${top}px`,
        height: `${height}px`,
        width,
        left,
        zIndex,
      }}
      title={film.filmTitle}
    >
      {isSelectedSession && (
        <button
          className={cn(
            "absolute md:hidden md:group-hover/sessionblock:block",
            {
              "top-1 right-1": !isTinyCard,
              "top-0.5 right-0.5": isTinyCard,
            }
          )}
          onClick={(e) => {
            e.stopPropagation();
            removeSession(session);
          }}
        >
          <X className="text-white" size={isTinyCard ? 10 : 16} />
        </button>
      )}

      <div className="text-xs font-medium w-full pr-4">{film.filmTitle}</div>
      <p className="text-[10px] text-white/60 mb-1">
        {startTime.format(startTime.minute() === 0 ? "HH" : "HH:mm")} ‒{" "}
        {endTime.format(endTime.minute() === 0 ? "HH A" : "HH:mm A")}
      </p>
      <p className="text-[10px] text-white/80">{session.location}</p>
    </div>
  );
}
