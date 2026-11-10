"use client";
import { useState } from "react";
import Link from "next/link";
import type { StyleImage } from "@/lib/data";
import { postJson, removePhoto, uploadPhoto } from "@/lib/upload";
import { Photo } from "@/app/components/photo";

function NotesField({ label, hint, field, initial, rows = 4 }: { label: string; hint: string; field: string; initial: string; rows?: number }) {
  const [value, setValue] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [state, setState] = useState<"idle" | "saving" | "error">("idle");
  // Picks up new text when the AI rewrites this field.
  const [seen, setSeen] = useState(initial);
  if (initial !== seen) {
    setSeen(initial);
    setValue(initial);
    setSaved(initial);
  }
  async function save() {
    setState("saving");
    try {
      await postJson("/api/profile", { [field]: value }, "PATCH");
      setSaved(value);
      setState("idle");
    } catch {
      setState("error");
    }
  }
  return (
    <div className="flex flex-col gap-1.5">
      <label className="label" htmlFor={field}>{label}</label>
      <p className="muted text-[13px]">{hint}</p>
      <textarea id={field} className="input" rows={rows} maxLength={2000} value={value} onChange={(e) => setValue(e.target.value)} />
      <div className="flex items-center gap-3">
        <button className="btn pri" disabled={value === saved || state === "saving"} onClick={save}>{state === "saving" ? "Saving…" : "Save"}</button>
        {state === "error" && <span className="text-donate text-[13px]">Could not save. Try again.</span>}
      </div>
    </div>
  );
}

export function AboutMe({
  userId,
  pro,
  initialPhotos,
  initialStyleNotes,
  initialAppearance,
}: {
  userId: string;
  pro: boolean;
  initialPhotos: StyleImage[];
  initialStyleNotes: string;
  initialAppearance: string;
}) {
  const [photos, setPhotos] = useState(initialPhotos);
  const [appearance, setAppearance] = useState(initialAppearance);
  const [busy, setBusy] = useState<"upload" | "analyze" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function add(files: FileList | null) {
    if (!files) return;
    setBusy("upload");
    setError(null);
    for (const file of Array.from(files).slice(0, 6 - photos.length)) {
      let path: string | null = null;
      try {
        path = await uploadPhoto(file, userId, "style");
        const { image } = await postJson("/api/style/images", { kind: "self", photo_path: path });
        setPhotos((xs) => [{ ...image, photo_url: URL.createObjectURL(file) }, ...xs]);
      } catch (e) {
        if (path) await removePhoto(path);
        setError((e as Error).message);
      }
    }
    setBusy(null);
  }

  async function remove(id: string) {
    await postJson(`/api/style/images/${id}`, undefined, "DELETE");
    setPhotos((xs) => xs.filter((x) => x.id !== id));
  }

  async function analyze() {
    setBusy("analyze");
    setError(null);
    try {
      const { appearance_notes } = await postJson("/api/style/self");
      setAppearance(appearance_notes);
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy(null);
  }

  return (
    <main className="wrap py-5 grid gap-5 lg:grid-cols-[1fr_1fr] items-start">
      <section className="card p-4 flex flex-col gap-3">
        <h2 className="font-bold text-lg">Photos of you</h2>
        <p className="muted text-[13px]">
          A few clear, well-lit photos (one full length, one closer to your face) let the stylist suggest colors and fits that suit you.
          They stay private to your account and are only used for your styling advice. Remove them anytime.
        </p>
        <div className="grid grid-cols-3 gap-2">
          {photos.map((p) => (
            <div key={p.id} className="relative">
              <Photo src={p.photo_url} alt="Photo of you" className="aspect-[3/4] w-full rounded-lg" />
              <button className="btn absolute top-1.5 right-1.5 !px-2 !py-1 text-[12px]" onClick={() => remove(p.id)} aria-label="Remove photo">✕</button>
            </div>
          ))}
          {photos.length < 6 && (
            <label className="aspect-[3/4] rounded-lg border border-dashed border-line flex items-center justify-center text-center p-2 cursor-pointer hover:border-accent muted text-[13px]">
              {busy === "upload" ? "Uploading…" : "+ Add photo"}
              <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => { add(e.target.files); e.target.value = ""; }} />
            </label>
          )}
        </div>
        {pro ? (
          <button className="btn pri self-start" disabled={!photos.length || busy !== null} onClick={analyze}>
            {busy === "analyze" ? "Looking at your photos…" : appearance ? "Update my styling notes" : "Get my styling notes"}
          </button>
        ) : (
          <p className="notice text-[13px]">Personal styling notes from your photos are part of <Link className="underline" href="/settings">Pro</Link>.</p>
        )}
        {error && <p className="notice err">{error}</p>}
      </section>

      <section className="card p-4 flex flex-col gap-5">
        <NotesField
          label="Your styling notes"
          hint="Colors and fits that suit you. Written by the AI from your photos; edit anything that's off."
          field="appearance_notes"
          initial={appearance}
          rows={7}
        />
        <NotesField
          label="Your style, in your words"
          hint="How you dress and what you want. For example: business casual, mostly desk days, sleeves run short on me, avoid loud colors, want to look more put-together on weekends."
          field="style_notes"
          initial={initialStyleNotes}
        />
      </section>
    </main>
  );
}
