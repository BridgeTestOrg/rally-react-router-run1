import { Badge, Button } from "../../components/ui";
import { content, t } from "../../lib/content";
import type { WaitlistResult as Result } from "./waitlist.types";

export function WaitlistResult({ result }: { result: Result }) {
  const city = content.waitlist.cities[result.city];
  const wrap = "min-w-0 break-words";
  if (result.kind === "success") {
    const s = content.waitlist.success;
    return (
      <div className="grid gap-4">
        <div>
          <Badge tone="success">{content.waitlist.success.badge}</Badge>
        </div>
        <h3 className={`text-card-title ${wrap}`}>
          {t(s.title, { place: result.place, city })}
        </h3>
        <p className={wrap}>{t(s.body, { email: result.email })}</p>
        <Button to="/#courts" variant="court">
          {s.cta}
        </Button>
      </div>
    );
  }
  const d = content.waitlist.duplicate;
  return (
    <div className="grid gap-4">
      <div>
        <Badge tone="warning">{d.badge}</Badge>
      </div>
      <h3 className={`text-card-title ${wrap}`}>{d.title}</h3>
      <p className={wrap}>
        {t(d.body, { email: result.email, city, date: result.joinedOn })}
      </p>
    </div>
  );
}
