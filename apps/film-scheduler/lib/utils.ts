import { Session, FilmsMap, Film } from "@/components/types";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { createEvents, EventAttributes } from "ics";

dayjs.extend(utc);

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateSessionId(session: Omit<Session, "id">): string {
  const { filmId, time, location } = session;
  const sessionString = `${filmId}-${new Date(time).toISOString()}-${location}`;

  // Simple hash function using bitwise operators
  let hash = 0;
  for (let i = 0; i < sessionString.length; i++) {
    const char = sessionString.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }

  return `session-${Math.abs(hash)}`; // Return a positive hash as the id
}

export function includesSession(
  sessions: Session[],
  session: Session,
): boolean {
  return sessions.some((s) => s.id === session.id);
}

export function findSessionIndex(
  sessions: Session[],
  session: Session,
): number {
  return sessions.findIndex((s) => s.id === session.id);
}

/**
 * Joins two arrays of sessions, ensuring there are no duplicate records.
 * Duplicate records are identified by their generated session ID.
 *
 * @param {Session[]} array1 - First array of sessions.
 * @param {Session[]} array2 - Second array of sessions.
 * @returns {Session[]} - A new array containing unique sessions from both arrays.
 */
export function joinSessions(array1: Session[], array2: Session[]): Session[] {
  const sessionIdSet = new Set<string>(...array1.map(s => s.id));

  const resultArray = [...array1]

  // Add all sessions from the second array that are not duplicates
  array2.forEach((session) => {
    const sessionId = session.id;
    if (!sessionIdSet.has(sessionId)) {
      resultArray.push(session);
    }
  });

  return resultArray;
}

export function scrollSessionIntoView(session: Session) {
  const sessionId = session.id;
  const sessionElement = document.getElementById(sessionId);

  if (sessionElement) {
    sessionElement.scrollIntoView({
      behavior: "smooth", // Smooth scrolling
      block: "center", // Center the session in view
    });
  }
}

export function scrollNowIndicatorIntoView() {
  const element = document.getElementById("now-indicator");
  if (element) {
    element.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }
}

export const getSessionDuration = (s: Session, filmsMap: FilmsMap) =>
  filmsMap.get(s.filmId)?.duration || 0;

/**
 * Serialize an array of sessions into a URL-safe string of session IDs.
 * This will store only the session IDs in the URL.
 */
export function serializeSessionIds(sessions: Session[]): string {
  const sessionIds = sessions.map((session) => session.id);
  return btoa(encodeURIComponent(JSON.stringify(sessionIds)));
}

/**
 * Deserialize a list of session IDs from a URL-safe string.
 * This function will return session objects by looking them up from available sessions.
 */
export function deserializeSessionIds(
  encodedString: string,
  availableSessions: Session[],
): Session[] {
  try {
    // Decode the session IDs from the URL
    const decodedString = decodeURIComponent(atob(encodedString));
    const sessionIds = JSON.parse(decodedString) as string[];

    // Filter and return sessions that match the session IDs
    return availableSessions.filter((session) =>
      sessionIds.includes(session.id),
    );
  } catch (error) {
    console.error("Failed to deserialize session IDs:", error);
    return [];
  }
}

/**
 * Load session IDs from the URL query params and return matching sessions from available data.
 * @param {Session[]} availableSessions - The list of available sessions to match against the session IDs.
 * @returns {Session[]} - An array of matching sessions if present in the URL, or an empty array.
 */
export function loadSessionIdsFromUrl(availableSessions: Session[]): Session[] {
  const urlParams = new URLSearchParams(window.location.search);
  const encodedSessionIds = urlParams.get("sessions");
  if (encodedSessionIds) {
    return deserializeSessionIds(encodedSessionIds, availableSessions);
  }
  return [];
}

/**
 * Generate a shareable URL with serialized session IDs in the query params.
 * @param {Session[]} sessions - The array of sessions to serialize into the URL (only session IDs will be included).
 * @returns {string} - A shareable URL containing the session IDs.
 */
export function generateShareableUrlWithSessionIds(
  sessions: Session[],
): string {
  const url = new URL(window.location.href);
  const serializedSessionIds = serializeSessionIds(sessions);
  url.searchParams.set("sessions", serializedSessionIds);
  return url.toString();
}

export function highlightSession(session: Session) {
  const sessionId = session.id;
  const sessionElement = document.getElementById(sessionId);

  if (sessionElement) {
    sessionElement.classList.add("session-highlight-effect");

    // Remove highlight after 1 second
    setTimeout(() => {
      sessionElement.classList.remove("session-highlight-effect");
    }, 1000);
  }
}

export function generateGoogleCalendarUrl(
  film: Film,
  session: Session,
): string {
  const title = encodeURIComponent(film.filmTitle);
  const location = encodeURIComponent(session.location);

  // Format start and end dates in UTC to ensure compatibility with Google Calendar
  const startDate = dayjs(session.time).utc().format("YYYYMMDDTHHmmss[Z]");
  const endDate = dayjs(session.time)
    .utc()
    .add(film.duration, "minute")
    .format("YYYYMMDDTHHmmss[Z]");

  const details = encodeURIComponent(`Directed by: ${film.directorName}

${film.synopsis}`);

  const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startDate}/${endDate}&details=${details}&location=${location}`;

  return googleCalendarUrl;
}

export async function generateCalendarICS(
  sessions: Session[],
  filmsMap: FilmsMap,
) {
  // Map sessions to ics-compatible event objects and filter out any null values
  const events: EventAttributes[] = sessions
    .map((session) => {
      const film = filmsMap.get(session.filmId);
      if (!film) return null;

      const start = dayjs(session.time);
      const duration = {
        hours: Math.floor(film.duration / 60),
        minutes: film.duration % 60,
      };

      return {
        title: film.filmTitle,
        description: film.synopsis,
        location: session.location,
        start: [
          start.year(),
          start.month() + 1,
          start.date(),
          start.hour(),
          start.minute(),
        ],
        duration,
        status: "CONFIRMED",
        organizer: {
          name: "Golden Horse Film Festival",
          email: "info@goldenhorse.org.tw",
        },
      } as EventAttributes;
    })
    .filter((event): event is EventAttributes => event !== null); // Type guard to remove null values

  // Generate the ICS content using createEvents
  const { error, value } = createEvents(events);
  if (error) {
    console.error("Error generating ICS:", error);
    throw new Error("Failed to generate ICS file");
  }

  return value; // This is the ICS content as a string
}
