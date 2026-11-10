import { RETAILERS } from "@/lib/retailers";

export type ShopSuggestion = { id: string; item_type: string; color: string; why: string };

/** "Shop this" links. Each goes through /go/<id> so the click is logged and tagged. */
export function ShopLinks({ s, compact = false }: { s: ShopSuggestion; compact?: boolean }) {
  return (
    <div className={`rounded-lg border border-line bg-bg ${compact ? "p-2.5" : "p-3"}`}>
      <div className="flex flex-wrap items-baseline gap-x-2">
        <span className="tag">Shop this</span>
        <span className="font-semibold">{s.color} {s.item_type.toLowerCase()}</span>
      </div>
      {s.why && <p className="muted text-[13px] mt-1">{s.why}</p>}
      <div className="flex flex-wrap gap-1.5 mt-2">
        {RETAILERS.map((r) => (
          <a key={r.key} className="chip sm" href={`/go/${s.id}?r=${r.key}`} target="_blank" rel="sponsored noopener">
            {r.name} ↗
          </a>
        ))}
      </div>
      <p className="muted text-[11px] mt-1.5">We may earn a commission from these links.</p>
    </div>
  );
}
