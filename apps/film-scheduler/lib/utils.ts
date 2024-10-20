import { Session, FilmsMap } from "@/components/types";
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateSessionId(session: Session): string {
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

export function includesSession(sessions: Session[], session: Session): boolean {
  return sessions.some(s => generateSessionId(s) === generateSessionId(session))
}

export function findSessionIndex(sessions: Session[], session: Session): number {
  return sessions.findIndex(s => generateSessionId(s) === generateSessionId(session))
}

export function scrollSessionIntoView(session: Session) {
  const sessionId = generateSessionId(session);
  const sessionElement = document.getElementById(sessionId);

  if (sessionElement) {
    sessionElement.scrollIntoView({
      behavior: "smooth", // Smooth scrolling
      block: "center",    // Center the session in view
    });
  }
}

export function scrollNowIndicatorIntoView() {
  const element = document.getElementById("now-indicator")
  if (element) {
    element.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }
}

export const getSessionDuration = (s: Session, filmsMap: FilmsMap) => filmsMap.get(s.filmId)?.duration || 0

/**
 * Serialize an array of sessions into a URL-safe string of session IDs.
 * This will store only the session IDs in the URL.
 */
export function serializeSessionIds(sessions: Session[]): string {
  const sessionIds = sessions.map((session) => generateSessionId(session));
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
      sessionIds.includes(generateSessionId(session)),
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
export function generateShareableUrlWithSessionIds(sessions: Session[]): string {
  const url = new URL(window.location.href);
  const serializedSessionIds = serializeSessionIds(sessions);
  url.searchParams.set("sessions", serializedSessionIds);
  return url.toString();
}
