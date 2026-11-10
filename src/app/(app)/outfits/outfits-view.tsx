"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { Item, Outfit } from "@/lib/categories";
import { Photo } from "@/app/components/photo";
import { ShopLinks, type ShopSuggestion } from "@/app/components/shop-links";

type Shop = ShopSuggestion & { source_id: string | null };

export function OutfitsView({ items, initialOutfits, shop, pro }: { items: Item[]; initialOutfits: Outfit[]; shop: Shop[]; pro: boolean }) {
  const [outfits, setOutfits] = useState(initialOutfits);
  const [occasion, setOccasion] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [shopRows, setShopRows] = useState(shop);
  const byId = new Map(items.map((i) => [i.id, i]));
  const shopFor = new Map(shopRows.map((s) => [s.source_id, s]));

  // Mark new AI suggestions as seen once they've been shown.
  useEffect(() => {
    for (const o of initialOutfits) if (!o.seen) fetch(`/api/outfits/${o.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ seen: true }) });
  }, [initialOutfits]);

  async function suggest() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/ai/outfits", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ occasion }) });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(json.error || "Could not get suggestions.");
    setOutfits((os) => [...json.outfits, ...os]);
    setShopRows((rs) => [...json.shop, ...rs]);
  }

  async function remove(id: string) {
    if (confirmDel !== id) return setConfirmDel(id);
    setConfirmDel(null);
    const res = await fetch(`/api/outfits/${id}`, { method: "DELETE" });
    if (res.ok) setOutfits((os) => os.filter((o) => o.id !== id));
  }

  async function rename(o: Outfit) {
    const name = prompt("Outfit name", o.name)?.trim();
    if (!name || name === o.name) return;
    const res = await fetch(`/api/outfits/${o.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ name }) });
    if (res.ok) setOutfits((os) => os.map((x) => (x.id === o.id ? { ...x, name } : x)));
  }

  return (
    <main className="wrap py-6">
      <h1 className="text-[clamp(26px,4vw,38px)] font-bold">Outfits</h1>

      <section className="card p-4 mt-4 flex flex-col gap-2 max-w-2xl">
        <h2 className="font-bold text-lg">Get suggestions from your closet</h2>
        {pro ? (
          <>
            <div className="flex flex-wrap gap-2">
              <input className="input flex-1 min-w-[200px]" placeholder="Occasion (optional): desk day, dinner out, weekend…" value={occasion} onChange={(e) => setOccasion(e.target.value)} maxLength={200} />
              <button className="btn pri" onClick={suggest} disabled={busy}>{busy ? "Thinking…" : "Suggest 3 outfits"}</button>
            </div>
            <p className="muted text-[13px]">Uses your style notes from <Link className="underline" href="/settings">Settings</Link>. Pieces marked donate are left out.</p>
          </>
        ) : (
          <p className="muted">AI outfit suggestions are part of Pro. <Link className="underline" href="/settings">Upgrade</Link></p>
        )}
        {error && <p className="notice err">{error}</p>}
      </section>

      {outfits.length === 0 ? (
        <p className="muted py-10">No saved outfits yet. In your <Link className="underline" href="/closet">closet</Link>, add pieces to the tray, name the outfit and save it{pro ? ", or ask for suggestions above" : ""}.</p>
      ) : (
        <div className="grid gap-3.5 py-5 grid-cols-[repeat(auto-fill,minmax(min(100%,300px),1fr))]">
          {outfits.map((o) => {
            const pieces = o.item_ids.map((id) => byId.get(id)).filter((x): x is Item => !!x);
            const s = shopFor.get(o.id);
            return (
              <article key={o.id} className="card p-3 flex flex-col gap-2 min-w-0">
                <div className="flex gap-2 items-center">
                  {o.source === "ai" && <span className="tag">AI pick</span>}
                  {!o.seen && <span className="tag" style={{ background: "var(--donate)" }}>New</span>}
                </div>
                <h3 className="font-bold text-base">{o.name}</h3>
                {o.why && <p className="muted text-[13px]">{o.why}</p>}
                <div className="flex gap-1.5 overflow-x-auto">
                  {pieces.map((p) => (
                    <div key={p.id} className="relative shrink-0 w-16 h-[114px] rounded-md overflow-hidden border border-line">
                      <Photo src={p.photo_url} alt={`${p.item_type}, ${p.color}`} className="w-full h-full" />
                      <b className="absolute inset-x-0 bottom-0 bg-black/60 text-white text-[9px] font-mono text-center">{p.code}</b>
                    </div>
                  ))}
                </div>
                <p className="code" style={{ color: "var(--muted)" }}>{pieces.map((p) => p.code).join(" + ")}</p>
                {s && <ShopLinks s={s} compact />}
                <div className="flex gap-2 mt-auto">
                  <button className="btn" onClick={() => rename(o)}>Rename</button>
                  <button className="btn danger" onClick={() => remove(o.id)}>{confirmDel === o.id ? "Confirm delete" : "Delete"}</button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
