"use client";
/* eslint-disable @next/next/no-img-element -- local object URLs */
import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { CATEGORIES, type CategoryCode } from "@/lib/categories";

type Draft = {
  key: string;
  preview: string;
  photo_path: string | null;
  state: "uploading" | "tagging" | "ready" | "saving" | "saved" | "error";
  error?: string;
  category: CategoryCode | "";
  item_type: string;
  color: string;
  details: string;
  flag: string;
  duplicate: string | null;
  code?: string;
};

/** Shrink to 1280px on the long edge as JPEG: smaller uploads, cheaper AI calls, same detail. */
async function resize(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 1280 / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("Could not read photo"))), "image/jpeg", 0.82));
}

export function AddPieces({ pro, userId }: { pro: boolean; userId: string }) {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const update = (key: string, p: Partial<Draft>) => setDrafts((ds) => ds.map((d) => (d.key === key ? { ...d, ...p } : d)));

  async function onFiles(files: FileList | null) {
    if (!files) return;
    const supabase = createClient();
    for (const file of Array.from(files).slice(0, 20)) {
      const key = crypto.randomUUID();
      const draft: Draft = {
        key, preview: URL.createObjectURL(file), photo_path: null, state: "uploading",
        category: "", item_type: "", color: "", details: "", flag: "", duplicate: null,
      };
      setDrafts((ds) => [draft, ...ds]);
      try {
        const blob = await resize(file);
        const path = `${userId}/${key}.jpg`;
        const { error } = await supabase.storage.from("closet").upload(path, blob, { contentType: "image/jpeg" });
        if (error) throw new Error(error.message);
        update(key, { photo_path: path, state: pro ? "tagging" : "ready" });
        if (pro) {
          const res = await fetch("/api/ai/tag", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ photo_path: path }) });
          const json = await res.json();
          if (!res.ok) {
            update(key, { state: "ready", flag: json.error || "AI tagging failed; fill in the details yourself." });
          } else {
            const t = json.tags;
            update(key, { state: "ready", category: t.category, item_type: t.item_type, color: t.color, details: t.details, flag: t.flag, duplicate: t.possible_duplicate_code });
          }
        }
      } catch (e) {
        update(key, { state: "error", error: (e as Error).message });
      }
    }
  }

  async function save(d: Draft) {
    if (!d.category || !d.item_type.trim()) return update(d.key, { error: "Choose a category and type." });
    update(d.key, { state: "saving", error: undefined });
    const res = await fetch("/api/items", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ category: d.category, item_type: d.item_type, color: d.color, details: d.details, flag: d.flag, photo_path: d.photo_path }),
    });
    const json = await res.json();
    if (!res.ok) update(d.key, { state: "ready", error: json.error });
    else update(d.key, { state: "saved", code: json.item.code });
  }

  async function discard(d: Draft) {
    if (d.photo_path && d.state !== "saved") await createClient().storage.from("closet").remove([d.photo_path]);
    setDrafts((ds) => ds.filter((x) => x.key !== d.key));
  }

  const savedCount = drafts.filter((d) => d.state === "saved").length;

  return (
    <main className="wrap py-6 max-w-4xl">
      <h1 className="text-[clamp(26px,4vw,38px)] font-bold">Add pieces</h1>
      <p className="muted mt-1">
        Hang each piece against a plain wall and take one photo per item.{" "}
        {pro ? "The AI fills in the details. Check them, then save." : <>Fill in the details yourself, or <Link className="underline" href="/settings">upgrade to Pro</Link> to have AI tag every photo.</>}
      </p>

      <label className="card mt-5 p-8 flex flex-col items-center justify-center gap-2 border-dashed cursor-pointer text-center hover:border-accent">
        <span className="font-semibold">Choose photos or take a picture</span>
        <span className="muted text-[13px]">Up to 20 at a time · JPG, PNG or HEIC</span>
        <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => { onFiles(e.target.files); e.target.value = ""; }} />
      </label>

      {savedCount > 0 && (
        <p className="notice mt-4">Saved {savedCount} piece{savedCount > 1 ? "s" : ""}. <Link className="underline" href="/closet">View closet</Link></p>
      )}

      <div className="mt-5 flex flex-col gap-4">
        {drafts.map((d) => (
          <div key={d.key} className="card p-3 flex gap-4 flex-col sm:flex-row">
            <img src={d.preview} alt="" className="w-full sm:w-40 aspect-[9/16] object-contain bg-photo rounded-lg" />
            <div className="flex-1 flex flex-col gap-2 min-w-0">
              {d.state === "uploading" && <p className="muted">Uploading…</p>}
              {d.state === "tagging" && <p className="muted">AI is reading the photo…</p>}
              {d.state === "error" && <p className="notice err">{d.error}</p>}
              {d.state === "saved" && <p className="notice">Saved as <span className="code">{d.code}</span>.</p>}
              {(d.state === "ready" || d.state === "saving") && (
                <>
                  {d.duplicate && <p className="notice text-[13px]">This looks like <span className="code">{d.duplicate}</span>, which is already in your closet.</p>}
                  {d.flag && <p className="text-[12px] text-[var(--flag)]">{d.flag}</p>}
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div>
                      <label className="label" htmlFor={`c-${d.key}`}>Category</label>
                      <select id={`c-${d.key}`} className="input" value={d.category} onChange={(e) => update(d.key, { category: e.target.value as CategoryCode })}>
                        <option value="">Choose…</option>
                        {CATEGORIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="label" htmlFor={`t-${d.key}`}>Type</label>
                      <input id={`t-${d.key}`} className="input" placeholder="Oxford shirt" value={d.item_type} onChange={(e) => update(d.key, { item_type: e.target.value })} />
                    </div>
                    <div>
                      <label className="label" htmlFor={`co-${d.key}`}>Color</label>
                      <input id={`co-${d.key}`} className="input" placeholder="Light blue" value={d.color} onChange={(e) => update(d.key, { color: e.target.value })} />
                    </div>
                    <div>
                      <label className="label" htmlFor={`de-${d.key}`}>Details</label>
                      <input id={`de-${d.key}`} className="input" placeholder="Button-down collar, cotton" value={d.details} onChange={(e) => update(d.key, { details: e.target.value })} />
                    </div>
                  </div>
                  {d.error && <p className="notice err">{d.error}</p>}
                  <div className="flex gap-2">
                    <button className="btn pri" disabled={d.state === "saving"} onClick={() => save(d)}>{d.state === "saving" ? "Saving…" : "Save piece"}</button>
                    <button className="btn" onClick={() => discard(d)}>Discard</button>
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
