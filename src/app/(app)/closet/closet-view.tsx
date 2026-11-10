"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CATEGORIES, categoryLabel, type Item, type Status } from "@/lib/categories";
import { Photo } from "@/app/components/photo";

const STATUS_FILTERS = [
  ["any", "Any status"],
  ["none", "Unreviewed"],
  ["keep", "Keep"],
  ["tailor", "Tailor"],
  ["donate", "Donate"],
  ["fav", "★ Favorites"],
] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number][0];

function statusMatch(i: Item, f: StatusFilter) {
  if (f === "any") return true;
  if (f === "none") return !i.status;
  if (f === "fav") return i.favorite;
  return i.status === f;
}

async function api(url: string, method: string, body?: unknown) {
  const res = await fetch(url, { method, headers: { "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "Something went wrong.");
  return json;
}

export function ClosetView({ initialItems, limit }: { initialItems: Item[]; limit: number | null }) {
  const [items, setItems] = useState(initialItems);
  const [group, setGroup] = useState<string | null>(null);
  const [sfilter, setSfilter] = useState<StatusFilter>("any");
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [outfitName, setOutfitName] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const byId = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const open = openId ? byId.get(openId) ?? null : null;

  const list = items.filter((i) => {
    if (group && i.category !== group) return false;
    if (!statusMatch(i, sfilter)) return false;
    if (!query) return true;
    const hay = `${i.code} ${i.item_type} ${i.color} ${i.details} ${i.notes}`.toLowerCase();
    return query.toLowerCase().split(/\s+/).every((w) => hay.includes(w));
  });

  const counts = { keep: 0, tailor: 0, donate: 0 };
  for (const i of items) if (i.status) counts[i.status]++;

  async function patch(id: string, p: Partial<Item>) {
    const prev = items;
    setItems((xs) => xs.map((x) => (x.id === id ? { ...x, ...p } : x)));
    try {
      await api(`/api/items/${id}`, "PATCH", p);
    } catch (e) {
      setItems(prev);
      setError((e as Error).message);
    }
  }

  function openPiece(i: Item) {
    setOpenId(i.id);
    if (i.is_new) patch(i.id, { is_new: false });
  }

  async function remove(id: string) {
    try {
      await api(`/api/items/${id}`, "DELETE");
      setItems((xs) => xs.filter((x) => x.id !== id));
      setPicked((p) => p.filter((x) => x !== id));
      setOpenId(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  function togglePick(id: string) {
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  }

  async function saveOutfit() {
    try {
      await api("/api/outfits", "POST", { name: outfitName.trim() || "My outfit", item_ids: picked });
      setPicked([]);
      setOutfitName("");
      router.push("/outfits");
    } catch (e) {
      setError((e as Error).message);
    }
  }

  if (!items.length) {
    return (
      <main className="wrap py-16 max-w-xl">
        <h1 className="text-3xl font-bold">Your closet is empty</h1>
        <p className="muted mt-2">Photograph a few pieces on a hanger to get started. Each one gets a code like SS-01 or PNT-03.</p>
        <Link className="btn pri mt-6" href="/add">Add your first pieces</Link>
      </main>
    );
  }

  return (
    <main className="wrap pb-40">
      <header className="flex flex-wrap items-baseline justify-between gap-2 pt-6 pb-2">
        <h1 className="text-[clamp(26px,4vw,38px)] font-bold">Closet</h1>
        <p className="muted tabular-nums">
          {items.length}
          {limit ? ` of ${limit}` : ""} pieces · {items.length - counts.keep - counts.tailor - counts.donate} unreviewed · {counts.keep} keep · {counts.tailor} tailor · {counts.donate} donate
        </p>
      </header>

      <div className="sticky top-0 z-10 bg-bg py-3 flex flex-col gap-2 border-b border-line">
        <div className="flex flex-wrap gap-1.5">
          <button className="chip" aria-pressed={group === null} onClick={() => setGroup(null)}>All<span>{items.length}</span></button>
          {CATEGORIES.map((c) => {
            const n = items.filter((i) => i.category === c.code).length;
            if (!n) return null;
            return (
              <button key={c.code} className="chip" aria-pressed={group === c.code} onClick={() => setGroup(c.code)}>
                {c.label}<span>{n}</span>
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-1.5 items-center">
          {STATUS_FILTERS.map(([k, label]) => (
            <button key={k} className="chip sm" aria-pressed={sfilter === k} onClick={() => setSfilter(k)}>
              {label}<span>{items.filter((i) => statusMatch(i, k)).length}</span>
            </button>
          ))}
          <input
            className="input sm:ml-auto sm:max-w-80"
            type="search"
            placeholder="Search color, type, or code (e.g. navy, SS-14)"
            aria-label="Search closet"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        {error && (
          <p className="notice err flex justify-between gap-2" role="alert">
            {error}
            <button className="underline" onClick={() => setError(null)}>Dismiss</button>
          </p>
        )}
      </div>

      {list.length === 0 ? (
        <p className="muted py-10">Nothing matches. Try a different filter or search.</p>
      ) : (
        <div className="grid gap-3.5 py-4 grid-cols-2 sm:grid-cols-[repeat(auto-fill,minmax(150px,1fr))]">
          {list.map((i) => (
            <button
              key={i.id}
              type="button"
              onClick={() => openPiece(i)}
              aria-pressed={picked.includes(i.id)}
              className="card overflow-hidden text-left relative flex flex-col min-w-0 aria-pressed:border-accent aria-pressed:ring-2 aria-pressed:ring-accent"
            >
              <Photo src={i.photo_url} alt={`${i.item_type}, ${i.color}`} className="aspect-[9/16] w-full" />
              <span className="p-2.5 flex flex-col gap-0.5 min-w-0">
                <span className="code">{i.code}</span>
                <span className="font-semibold break-words">{i.item_type}</span>
                <span className="muted text-[13px] break-words">{i.color}</span>
                {i.notes && <span className="muted text-[11px] truncate">{i.notes}</span>}
              </span>
              {i.is_new && <span className="tag absolute top-1.5 right-1.5">New</span>}
              {i.status && <span className={`stat ${i.status} absolute top-1.5 left-1.5`}>{i.status}</span>}
              {i.favorite && <span aria-label="Favorite" className="absolute right-2 bottom-16 text-[var(--star)] text-base drop-shadow">★</span>}
            </button>
          ))}
        </div>
      )}

      {/* Outfit tray */}
      <div className="fixed inset-x-0 bottom-0 z-20 bg-surface border-t border-line">
        <div className="wrap py-2.5 flex flex-wrap items-center gap-2.5">
          <div className="flex gap-2 overflow-x-auto flex-1 min-w-[200px] items-center">
            {picked.length === 0 && <span className="muted text-[13px]">Open a piece and choose “Add to outfit” to line up an outfit here.</span>}
            {picked.map((id) => {
              const i = byId.get(id);
              if (!i) return null;
              return (
                <button key={id} onClick={() => togglePick(id)} title={`Remove ${i.code}`} className="relative shrink-0 w-[54px] h-24 rounded-md overflow-hidden border border-line">
                  <Photo src={i.photo_url} alt={i.item_type} className="w-full h-full" />
                  <b className="absolute inset-x-0 bottom-0 bg-black/60 text-white text-[9px] font-mono text-center">{i.code}</b>
                </button>
              );
            })}
          </div>
          <input className="input w-40" placeholder="Outfit name" aria-label="Outfit name" maxLength={60} value={outfitName} onChange={(e) => setOutfitName(e.target.value)} />
          <button className="btn pri" disabled={picked.length < 2} onClick={saveOutfit}>Save outfit</button>
          <button className="btn" disabled={!picked.length} onClick={() => setPicked([])}>Clear</button>
        </div>
      </div>

      {open && (
        <PieceDialog
          item={open}
          picked={picked.includes(open.id)}
          onClose={() => setOpenId(null)}
          onPatch={(p) => patch(open.id, p)}
          onPick={() => togglePick(open.id)}
          onDelete={() => remove(open.id)}
        />
      )}
    </main>
  );
}

function PieceDialog({
  item,
  picked,
  onClose,
  onPatch,
  onPick,
  onDelete,
}: {
  item: Item;
  picked: boolean;
  onClose: () => void;
  onPatch: (p: Partial<Item>) => void;
  onPick: () => void;
  onDelete: () => void;
}) {
  const [notes, setNotes] = useState(item.notes);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ item_type: item.item_type, color: item.color, details: item.details });
  const [confirmDelete, setConfirmDelete] = useState(false);

  function close() {
    if (notes.trim() !== item.notes) onPatch({ notes: notes.trim() });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-30 bg-black/70 flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && close()} onKeyDown={(e) => e.key === "Escape" && close()}>
      <div role="dialog" aria-modal="true" aria-labelledby="piece-title" className="card max-w-[440px] w-full max-h-full overflow-auto flex flex-col">
        <Photo src={item.photo_url} alt={`${item.item_type}, ${item.color}`} className="w-full h-[52vh]" />
        <div className="p-4 flex flex-col gap-2">
          <div className="code">{item.code} · {categoryLabel(item.category)}</div>
          {editing ? (
            <div className="flex flex-col gap-2">
              <input className="input" aria-label="Type" value={draft.item_type} onChange={(e) => setDraft({ ...draft, item_type: e.target.value })} />
              <input className="input" aria-label="Color" value={draft.color} onChange={(e) => setDraft({ ...draft, color: e.target.value })} />
              <input className="input" aria-label="Details" value={draft.details} onChange={(e) => setDraft({ ...draft, details: e.target.value })} />
              <div className="flex gap-2">
                <button className="btn pri" onClick={() => { onPatch(draft); setEditing(false); }}>Save</button>
                <button className="btn" onClick={() => setEditing(false)}>Cancel</button>
              </div>
            </div>
          ) : (
            <>
              <h2 id="piece-title" className="font-semibold text-base" style={{ fontFamily: "var(--font-sans)" }}>{item.item_type}</h2>
              <p className="muted">{item.color}{item.details ? ` · ${item.details}` : ""}</p>
              {item.flag && <p className="text-[12px] text-[var(--flag)]">{item.flag}</p>}
            </>
          )}
          <div className="flex flex-wrap gap-1.5">
            {(["keep", "tailor", "donate"] as Status[]).map((s) => (
              <button
                key={s}
                className="btn capitalize"
                aria-pressed={item.status === s}
                style={item.status === s ? { background: `var(--${s})`, color: "#fff", borderColor: "transparent" } : undefined}
                onClick={() => onPatch({ status: item.status === s ? null : s })}
              >
                {s}
              </button>
            ))}
            <button
              className="btn"
              aria-pressed={item.favorite}
              style={item.favorite ? { background: "var(--star)", color: "#111", borderColor: "transparent" } : undefined}
              onClick={() => onPatch({ favorite: !item.favorite })}
            >
              ★ Favorite
            </button>
          </div>
          <textarea className="input" placeholder="Notes (fit, what it pairs with, repairs…)" aria-label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={() => notes.trim() !== item.notes && onPatch({ notes: notes.trim() })} />
          <div className="flex flex-wrap gap-2">
            <button className="btn pri" onClick={onPick}>{picked ? "Remove from outfit" : "Add to outfit"}</button>
            {!editing && <button className="btn" onClick={() => setEditing(true)}>Edit</button>}
            <button className="btn danger" onClick={() => (confirmDelete ? onDelete() : setConfirmDelete(true))}>{confirmDelete ? "Confirm delete" : "Delete"}</button>
            <button className="btn ml-auto" onClick={close}>Close</button>
          </div>
        </div>
      </div>
    </div>
  );
}
