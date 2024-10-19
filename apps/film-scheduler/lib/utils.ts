import { Session } from "@/components/types";
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateSessionId(session: Session): string {
  const { filmId, time, location } = session;
  const sessionString = `${filmId}-${time.toISOString()}-${location}`;

  // Simple hash function using bitwise operators
  let hash = 0;
  for (let i = 0; i < sessionString.length; i++) {
    const char = sessionString.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }

  return `session-${Math.abs(hash)}`; // Return a positive hash as the id
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
