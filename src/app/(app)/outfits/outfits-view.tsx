"use client";
import { useState } from "react";
import Link from "next/link";
import type { Item, Outfit } from "@/lib/categories";
import { postJson } from "@/lib/upload";
import { Photo } from "@/app/components/photo";
import { ShopLinks, type ShopSuggestion } from "@/app/components/shop-links";

type Shop = ShopSuggestion & { source_id: string | null };

const PRESETS = ["Desk day", "Dinner out", "Weekend errands", "Date night", "Job site", "Cold morning, warm afternoon"];

export function OutfitsView({ items, initialOutfits, shop, pro }: { items: Item[]; initialOutfits: Outfit[]; shop: Shop[]; pro: boolean }) {
  const [outfits, setOutfits] = useState(initialOutfits);
  const [shopRows, setShopRows] = useState(shop);
  const [request, setRequest] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const byId = new Map(items.map((i) => [i.id, i]));

  const suggestions = outfits.filter((o) => !o.saved);
  const saved = outfits.filter((o) => o.saved);

  async function suggest(req: string) {
    setBusy(true);
    setError(null);
    try {
      const json = await postJson("/api/ai/outfits", { request: req });
      setOutfits((os) => [...json.outfits, ...os]);
      setShopRows((rs) => [...json.shop, ...rs]);
      if (!json.outfits.length) setError("No outfits came back. Try a different request.");
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy(false);
  }

  async function patch(id: string, p: Partial<Outfit>) {
    setOutfits((os) => os.map((o) => (o.id === id ? { ...o, ...p } : o)));
    await postJson(`/api/outfits/${id}`, p, "PATCH").catch((e) => setError(e.message));
  }

  async function remove(id: string, confirmFirst = true) {
    if (confirmFirst && confirmDel !== id) return setConfirmDel(id);
    setConfirmDel(null);
    await postJson(`/api/outfits/${id}`, undefined, "DELETE").catch((e) => setError(e.message));
    setOutfits((os) => os.filter((o) => o.id !== id));
  }

  async function rename(o: Outfit) {
    const name = prompt("Outfit name", o.name)?.trim();
    if (name && name !== o.name) patch(o.id, { name });
  }

  function Card({ o }: { o: Outfit }) {
    const pieces = o.item_ids.map((id) => byId.get(id)).filter((x): x is Item => !!x);
    const missing = shopRows.filter((s) => s.source_id === o.id);
    return (
      <article className="card p-3 flex flex-col gap-2 min-w-0">
        {o.source === "ai" && <span className="tag self-start">AI pick</span>}
        <h3 className="font-bold text-base">{o.name}</h3>
        {o.why && <p className="muted text-[13px]">{o.why}</p>}
        <div className="flex gap-1.5 overflow-x-auto">
          {pieces.map((p) => (
            <div key={p.id} className="relative shrink-0 w-16 h-[114px] rounded-md overflow-hidden border border-line" title={`${p.item_type}, ${p.color}`}>
              <Photo src={p.photo_url} alt={`${p.item_type}, ${p.color}`} className="w-full h-full" />
              <b className="absolute inset-x-0 bottom-0 bg-black/60 text-white text-[9px] font-mono text-center">{p.code}</b>
            </div>
          ))}
          {missing.map((m) => (
            <div key={m.id} className="shrink-0 w-16 h-[114px] rounded-md border-2 border-dashed border-line flex flex-col items-center justify-center text-center p-1 text-[10px] leading-tight muted">
              <span className="text-lg leading-none">+</span>
              {m.color} {m.item_type.toLowerCase()}
            </div>
          ))}
        </div>
        <p className="code" style={{ color: "var(--muted)" }}>
          {pieces.map((p) => p.code).join(" + ")}
          {missing.length ? ` + ${missing.length} to buy` : ""}
        </p>
        {missing.map((m) => (
          <ShopLinks key={m.id} s={m} compact />
        ))}
        <div className="flex flex-wrap gap-2 mt-auto pt-1">
          {o.saved ? (
            <>
              <button className="btn" onClick={() => rename(o)}>Rename</button>
              <button className="btn danger" onClick={() => remove(o.id)}>{confirmDel === o.id ? "Confirm delete" : "Delete"}</button>
            </>
          ) : (
            <>
              <button className="btn pri" onClick={() => patch(o.id, { saved: true, seen: true })}>♥ Save outfit</button>
              <button className="btn" onClick={() => remove(o.id, false)}>Dismiss</button>
            </>
          )}
        </div>
      </article>
    );
  }

  const grid = "grid gap-3.5 grid-cols-[repeat(auto-fill,minmax(min(100%,300px),1fr))]";

  return (
    <main className="wrap py-5 flex flex-col gap-6">
      <section className="card p-4 flex flex-col gap-2.5 max-w-3xl">
        <h2 className="font-bold text-lg">Request outfits</h2>
        {pro ? (
          <>
            <form
              className="flex flex-wrap gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                suggest(request);
              }}
            >
              <input
                className="input flex-1 min-w-[220px]"
                placeholder="What for? e.g. client lunch, rainy Saturday, the look from my board…"
                value={request}
                onChange={(e) => setRequest(e.target.value)}
                maxLength={300}
              />
              <button className="btn pri" disabled={busy}>{busy ? "Putting outfits together…" : "Suggest 3 outfits"}</button>
            </form>
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((p) => (
                <button key={p} className="chip sm" disabled={busy} onClick={() => { setRequest(p); suggest(p); }}>{p}</button>
              ))}
            </div>
            <p className="muted text-[13px]">
              Built from your closet, aimed at your <Link className="underline" href="/style">style board</Link> and your{" "}
              <Link className="underline" href="/style/me">styling notes</Link>. Anything you don&apos;t own gets a link to buy it.
            </p>
          </>
        ) : (
          <p className="muted">AI outfit suggestions are part of Pro. <Link className="underline" href="/settings">Upgrade</Link>. You can still build outfits yourself in your <Link className="underline" href="/closet">closet</Link>.</p>
        )}
        {error && <p className="notice err">{error}</p>}
      </section>

      {suggestions.length > 0 && (
        <section>
          <h2 className="text-xl font-bold mb-2">Suggestions <span className="muted text-base font-normal">· save the ones you like</span></h2>
          <div className={grid}>{suggestions.map((o) => <Card key={o.id} o={o} />)}</div>
        </section>
      )}

      <section>
        <h2 className="text-xl font-bold mb-2">Saved outfits</h2>
        {saved.length === 0 ? (
          <p className="muted">
            Nothing saved yet. Save a suggestion above, or build one in your <Link className="underline" href="/closet">closet</Link>: open pieces, choose
            &quot;Add to outfit&quot;, then save.
          </p>
        ) : (
          <div className={grid}>{saved.map((o) => <Card key={o.id} o={o} />)}</div>
        )}
      </section>
    </main>
  );
}
