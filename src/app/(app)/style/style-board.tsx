"use client";
import { useState } from "react";
import Link from "next/link";
import type { StyleImage } from "@/lib/data";
import { postJson, removePhoto, uploadPhoto } from "@/lib/upload";
import { Photo } from "@/app/components/photo";

type Pending = { key: string; preview: string; error?: string };

export function StyleBoard({ initial, userId, pro }: { initial: StyleImage[]; userId: string; pro: boolean }) {
  const [images, setImages] = useState(initial);
  const [pending, setPending] = useState<Pending[]>([]);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);

  async function add(files: FileList | null) {
    if (!files) return;
    for (const file of Array.from(files).slice(0, 12)) {
      const key = crypto.randomUUID();
      setPending((p) => [{ key, preview: URL.createObjectURL(file) }, ...p]);
      let path: string | null = null;
      try {
        path = await uploadPhoto(file, userId, "style");
        const { image } = await postJson("/api/style/images", { kind: "inspo", photo_path: path });
        setImages((xs) => [{ ...image, photo_url: URL.createObjectURL(file) }, ...xs]);
        setPending((p) => p.filter((x) => x.key !== key));
      } catch (e) {
        if (path) await removePhoto(path);
        setPending((p) => p.map((x) => (x.key === key ? { ...x, error: (e as Error).message } : x)));
      }
    }
  }

  async function remove(id: string) {
    if (confirmDel !== id) return setConfirmDel(id);
    setConfirmDel(null);
    await postJson(`/api/style/images/${id}`, undefined, "DELETE");
    setImages((xs) => xs.filter((x) => x.id !== id));
  }

  async function saveCaption(img: StyleImage, caption: string) {
    if (caption === img.caption) return;
    setImages((xs) => xs.map((x) => (x.id === img.id ? { ...x, caption } : x)));
    await postJson(`/api/style/images/${img.id}`, { caption }, "PATCH");
  }

  return (
    <main className="wrap py-5">
      <p className="muted max-w-2xl">
        Save photos of looks you love: screenshots, magazine pages, people on the street. {pro ? "The AI reads each one, so the stylist and your outfit suggestions aim for these looks." : <>On <Link className="underline" href="/settings">Pro</Link>, the AI reads each one and aims your outfit suggestions at these looks.</>}
      </p>

      <label className="card mt-4 p-6 flex flex-col items-center justify-center gap-1 border-dashed cursor-pointer text-center hover:border-accent">
        <span className="font-semibold">Drop in looks you like</span>
        <span className="muted text-[13px]">Up to 12 at a time</span>
        <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => { add(e.target.files); e.target.value = ""; }} />
      </label>

      {!images.length && !pending.length && <p className="muted py-8">Your board is empty. Add a few looks to get started.</p>}

      <div className="mt-5 columns-2 sm:columns-3 lg:columns-4 gap-3.5 [&>*]:mb-3.5 [&>*]:break-inside-avoid">
        {pending.map((p) => (
          <div key={p.key} className="card overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element -- local preview */}
            <img src={p.preview} alt="" className="w-full block opacity-60" />
            <p className={`p-2.5 text-[13px] ${p.error ? "text-donate" : "muted"}`}>{p.error ?? (pro ? "Reading the look…" : "Uploading…")}</p>
          </div>
        ))}
        {images.map((img) => (
          <article key={img.id} className="card overflow-hidden">
            <Photo src={img.photo_url} alt={img.ai_notes?.look ?? "Saved look"} className="w-full [&>img]:h-auto" />
            <div className="p-3 flex flex-col gap-1.5">
              {img.ai_notes ? (
                <>
                  <h3 className="font-bold text-[15px]">{img.ai_notes.look}</h3>
                  <p className="muted text-[13px]">{img.ai_notes.description}</p>
                  {img.ai_notes.key_pieces.length > 0 && (
                    <p className="text-[12px]"><b>Key pieces:</b> {img.ai_notes.key_pieces.join(", ")}</p>
                  )}
                </>
              ) : null}
              <input
                className="input text-[13px] py-1.5"
                placeholder="What do you like about it?"
                defaultValue={img.caption}
                maxLength={300}
                aria-label="Your note"
                onBlur={(e) => saveCaption(img, e.target.value.trim())}
              />
              <div className="flex flex-wrap gap-1.5">
                {pro && (
                  <Link className="btn pri" href={`/style/stylist?look=${img.id}`}>Get this look</Link>
                )}
                <button className="btn danger" onClick={() => remove(img.id)}>{confirmDel === img.id ? "Confirm" : "Remove"}</button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
