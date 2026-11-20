import iconUrl from "../../assets/conditions-unavailable.svg";
import { content } from "../../lib/content";

/** Compact shared notice shown when no city has conditions. */
export function LiveNotice() {
  return (
    <div className="live-notice">
      <img src={iconUrl} alt="" width={28} height={28} aria-hidden="true" />
      <div>
        <p className="text-label text-ink">{content.live.allUnavailableTitle}</p>
        <p className="text-small text-muted mt-1">
          {content.live.allUnavailableBody}
        </p>
      </div>
    </div>
  );
}
