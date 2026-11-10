"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function LoginForm({ initialMode, next, linkError }: { initialMode: "signin" | "signup"; next: string; linkError: boolean }) {
  const [mode, setMode] = useState(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ err?: boolean; text: string } | null>(
    linkError ? { err: true, text: "That link has expired. Sign in or request a new one." } : null,
  );
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const supabase = createClient();
    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
      });
      if (error) setMsg({ err: true, text: error.message });
      else if (data.session) router.replace(next);
      else setMsg({ text: "Check your email for a link to confirm your account." });
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMsg({ err: true, text: error.message });
      else {
        router.replace(next);
        router.refresh();
      }
    }
    setBusy(false);
  }

  async function reset() {
    if (!email) return setMsg({ err: true, text: "Enter your email first, then choose Forgot password." });
    const { error } = await createClient().auth.resetPasswordForEmail(email, {
      redirectTo: `${location.origin}/auth/callback?next=/settings`,
    });
    setMsg(error ? { err: true, text: error.message } : { text: "If that email has an account, a reset link is on its way." });
  }

  return (
    <form onSubmit={submit} className="card p-6 w-full max-w-sm flex flex-col gap-4">
      <div className="flex gap-2" role="tablist">
        {(["signin", "signup"] as const).map((m) => (
          <button key={m} type="button" className="chip" aria-pressed={mode === m} onClick={() => setMode(m)}>
            {m === "signin" ? "Sign in" : "Create account"}
          </button>
        ))}
      </div>
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input id="email" className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div>
        <label className="label" htmlFor="pw">Password</label>
        <input
          id="pw"
          className="input"
          type="password"
          minLength={8}
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {mode === "signup" && <p className="muted text-[12px] mt-1">At least 8 characters.</p>}
      </div>
      {msg && <p className={`notice ${msg.err ? "err" : ""}`} role="status">{msg.text}</p>}
      <button className="btn pri justify-center" disabled={busy}>
        {busy ? "One moment…" : mode === "signin" ? "Sign in" : "Create free account"}
      </button>
      {mode === "signin" && (
        <button type="button" className="text-[13px] muted underline self-start" onClick={reset}>Forgot password?</button>
      )}
    </form>
  );
}
