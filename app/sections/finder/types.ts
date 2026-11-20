/** Client-safe, serializable presentation row. No runtime imports allowed here. */
export interface FinderCourtRow {
  id: string;
  name: string;
  /** Formatted metadata line, e.g. "Denver, CO · 4 courts · lights". */
  meta: string;
  /** Formatted status line. */
  status: string;
  isClosed: boolean;
  /** Original local `HH:MM` time plus its formatted label. Empty when closed. */
  slots: { time: string; label: string }[];
}
