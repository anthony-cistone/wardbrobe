"use client";
/* eslint-disable @next/next/no-img-element -- local previews and signed URLs */
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Item } from "@/lib/categories";
import { postJson, uploadPhoto } from "@/lib/upload";
import { Photo } from "@/app/components/photo";
import { ShopLinks, type ShopSuggestion } from "@/app/components/shop-links";

export type ChatMsg = { id?: string; role: "user" | "assistant"; content: string; codes?: string[] };
type Shop = ShopSuggestion & { source_id: string | null };
type Attach = { photo_path: string | null; preview: string; file?: File };

const STARTERS = [
  "What's my style, based on my board?",
  "How do I get a more polished weekend look with what I own?",
  "Which colors should I wear more of?",
  "What 3 pieces would make the biggest difference to my closet?",
];

export function Stylist({
  pro,
  userId,
  items,
  initialMessages,
  initialShop,
  look,
}: {
  pro: boolean;
  userId: string;
  items: Item[];
  initialMessages: ChatMsg[];
  initialShop: Shop[];
  look: { photo_path: string; photo_url: string | null; name: string } | null;
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [shop, setShop] = useState(initialShop);
  const [text, setText] = useState(look ? `How can I get ${look.name.toLowerCase()} with what I own?` : "");
  const [attach, setAttach] = useState<Attach | null>(look ? { photo_path: look.photo_path, preview: look.photo_url ?? "" } : null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const byCode = new Map(items.map((i) => [i.code.toUpperCase(), i]));
  const shopFor = (id?: string) => shop.filter((s) => s.source_id === id);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, busy]);

  async function send(message: string) {
    if (busy || (!message.trim() && !attach)) return;
    setBusy(true);
    setError(null);
    const pendingUser: ChatMsg = { role: "user", content: (attach ? "[Shared a photo] " : "") + message };
    setMessages((m) => [...m, pendingUser]);
    try {
      let photo_path = attach?.photo_path ?? null;
      if (attach?.file) photo_path = await uploadPhoto(attach.file, userId, "chat");
      const res = await postJson("/api/style/chat", { message: message.trim(), photo_path });
      setMessages((m) => [...m.slice(0, -1), res.user, res.reply]);
      setShop((s) => [...s, ...res.shop]);
      setText("");
      setAttach(null);
    } catch (e) {
      setMessages((m) => m.slice(0, -1));
      setError((e as Error).message);
    }
    setBusy(false);
  }

  async function clear() {
    if (!confirm("Clear the whole conversation?")) return;
    await postJson("/api/style/chat", undefined, "DELETE");
    setMessages([]);
  }

  if (!pro) {
    return (
      <main className="wrap py-5 max-w-2xl">
        <p className="notice">
          The AI stylist is part of <Link className="underline" href="/settings">Pro</Link>. It knows your closet, your style board and your
          styling notes, and answers questions like &quot;how do I get this look with what I own?&quot;
        </p>
      </main>
    );
  }

  return (
    <main className="wrap py-5 max-w-3xl flex flex-col gap-3 min-h-[60vh]">
      <div className="flex justify-between items-center gap-2">
        <p className="muted text-[13px]">Your stylist knows your closet, your style board and your styling notes.</p>
        {messages.length > 0 && <button className="btn" onClick={clear}>Clear chat</button>}
      </div>

      {messages.length === 0 && (
        <div className="flex flex-wrap gap-2">
          {STARTERS.map((s) => (
            <button key={s} className="chip" onClick={() => send(s)}>{s}</button>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-3" aria-live="polite">
        {messages.map((m, i) => (
          <div key={m.id ?? `p${i}`} className={m.role === "user" ? "self-end max-w-[85%]" : "self-start max-w-[95%] w-full"}>
            {m.role === "user" ? (
              <p className="rounded-2xl rounded-br-sm bg-accent text-accent-ink px-3.5 py-2 whitespace-pre-wrap">{m.content}</p>
            ) : (
              <div className="card p-3.5 flex flex-col gap-2.5">
                <p className="whitespace-pre-wrap">{m.content}</p>
                {!!m.codes?.length && (
                  <div className="flex gap-1.5 overflow-x-auto">
                    {m.codes.map((c) => {
                      const it = byCode.get(c.toUpperCase());
                      if (!it) return null;
                      return (
                        <div key={c} className="relative shrink-0 w-14 h-24 rounded-md overflow-hidden border border-line" title={`${it.item_type}, ${it.color}`}>
                          <Photo src={it.photo_url} alt={`${it.item_type}, ${it.color}`} className="w-full h-full" />
                          <b className="absolute inset-x-0 bottom-0 bg-black/60 text-white text-[9px] font-mono text-center">{it.code}</b>
                        </div>
                      );
                    })}
                  </div>
                )}
                {shopFor(m.id).map((s) => <ShopLinks key={s.id} s={s} compact />)}
              </div>
            )}
          </div>
        ))}
        {busy && <p className="muted self-start">Stylist is thinking…</p>}
        <div ref={endRef} />
      </div>

      {error && <p className="notice err">{error}</p>}

      <form
        className="sticky bottom-0 bg-bg pt-2 pb-3 flex flex-col gap-2 border-t border-line mt-auto"
        onSubmit={(e) => {
          e.preventDefault();
          send(text);
        }}
      >
        {attach && (
          <div className="flex items-center gap-2">
            {attach.preview && <img src={attach.preview} alt="Attached look" className="h-16 w-12 object-cover rounded" />}
            <span className="muted text-[13px]">Photo attached</span>
            <button type="button" className="underline text-[13px]" onClick={() => setAttach(null)}>Remove</button>
          </div>
        )}
        <div className="flex gap-2 items-end">
          <label className="btn cursor-pointer" title="Attach a photo of a look">
            📷<span className="sr-only">Attach a photo</span>
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) setAttach({ photo_path: null, preview: URL.createObjectURL(f), file: f });
                e.target.value = "";
              }}
            />
          </label>
          <textarea
            className="input flex-1 min-h-[44px]"
            rows={1}
            placeholder="Ask about a style, or how to get a look…"
            value={text}
            maxLength={2000}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(text);
              }
            }}
          />
          <button className="btn pri" disabled={busy || (!text.trim() && !attach)}>Send</button>
        </div>
      </form>
    </main>
  );
}
