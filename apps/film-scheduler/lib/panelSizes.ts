// Resizable desktop panels. Main turns the stored widths into the CSS variables
// --sidebar-width (read by components/ui/sidebar) and --film-panel-width (read by
// FilmSidebar and the calendar's right padding).
export const SIDEBAR_SIZE = {
  storageKey: "panelWidth:sidebar",
  defaultWidth: 288, // shadcn's 18rem
  minWidth: 240,
  maxWidth: 480,
} as const;

export const FILM_PANEL_SIZE = {
  storageKey: "panelWidth:filmPanel",
  defaultWidth: 320,
  minWidth: 256,
  maxWidth: 560,
} as const;

/** CSS width for a stored panel width, capped so the calendar keeps room when the window shrinks. */
export const panelWidthCss = (width: number) => `min(${width}px, 45vw)`;
