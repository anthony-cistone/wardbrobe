"use client";
import { useState } from "react";

export function StyleNotes({ initial }: { initial: string }) {
  const [value, setValue] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [state, setState] = useState<"idle" | "saving" | "error">("idle");

  async function save() {
    setState("saving");
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ style_notes: value }),
    });
    if (res.ok) {
      setSaved(value);
      setState("idle");
    } else setState("error");
  }

  return (
    <div className="flex flex-col gap-2">
      <textarea className="input" maxLength={1000} value={value} onChange={(e) => setValue(e.target.value)} aria-label="Style notes" />
      <div className="flex items-center gap-3">
        <button className="btn pri" disabled={value === saved || state === "saving"} onClick={save}>
          {state === "saving" ? "Saving…" : "Save notes"}
        </button>
        {state === "error" && <span className="text-donate text-[13px]">Could not save. Try again.</span>}
        {value === saved && saved && <span className="muted text-[13px]">Saved</span>}
      </div>
    </div>
  );
}
