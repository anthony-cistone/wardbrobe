"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function RunReview({ hasReview }: { hasReview: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  async function run() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/ai/review", { method: "POST" });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(json.error || "Review failed. Please try again.");
    router.refresh();
  }
  return (
    <div className="mt-4 flex flex-wrap gap-3 items-center">
      <button className="btn pri" onClick={run} disabled={busy}>{busy ? "Reviewing your closet…" : hasReview ? "Run a fresh review" : "Review my closet"}</button>
      {busy && <span className="muted text-[13px]">This can take up to a minute.</span>}
      {error && <p className="notice err w-full">{error}</p>}
    </div>
  );
}
