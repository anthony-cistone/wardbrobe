import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PLANS, isPro, type AiKind } from "@/lib/plans";
import { sortItems, type Item, type Outfit } from "@/lib/categories";

export type Profile = {
  id: string;
  email: string | null;
  style_notes: string;
  plan: "free" | "pro";
  subscription_status: string | null;
  stripe_customer_id: string | null;
  current_period_end: string | null;
};

/** The signed-in user and their profile, or null. Cached per request. */
export const getSession = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("id,email,style_notes,plan,subscription_status,stripe_customer_id,current_period_end")
    .eq("id", user.id)
    .single<Profile>();
  if (!profile) return null;
  return { supabase, user, profile, pro: isPro(profile.plan, profile.subscription_status) };
});

/** For pages: redirect to login when signed out. */
export async function requireSession() {
  const s = await getSession();
  if (!s) redirect("/login");
  return s;
}

const PHOTO_TTL = 60 * 60; // signed photo URLs last an hour

export async function getItems(): Promise<Item[]> {
  const { supabase } = await requireSession();
  const { data, error } = await supabase.from("items").select("*").returns<Item[]>();
  if (error) throw error;
  const items = sortItems(data ?? []);
  const paths = items.map((i) => i.photo_path).filter((p): p is string => !!p);
  if (paths.length) {
    const { data: signed } = await supabase.storage.from("closet").createSignedUrls(paths, PHOTO_TTL);
    const byPath = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));
    for (const i of items) i.photo_url = i.photo_path ? byPath.get(i.photo_path) ?? null : null;
  }
  return items;
}

export async function getOutfits(): Promise<Outfit[]> {
  const { supabase } = await requireSession();
  const { data, error } = await supabase
    .from("outfits")
    .select("*")
    .order("created_at", { ascending: false })
    .returns<Outfit[]>();
  if (error) throw error;
  return data ?? [];
}

function monthStart() {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString();
}

export async function aiUsageThisMonth(userId: string) {
  const admin = createAdminClient();
  const { data } = await admin.from("ai_usage").select("kind").eq("user_id", userId).gte("created_at", monthStart());
  const counts: Record<AiKind, number> = { tag: 0, outfits: 0, review: 0 };
  for (const r of data ?? []) counts[r.kind as AiKind]++;
  return counts;
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** For API routes: the session plus a check that this AI feature is allowed and under its monthly cap. */
export async function requireAi(kind: AiKind) {
  const s = await getSession();
  if (!s) throw new HttpError(401, "Please sign in.");
  if (!s.pro) throw new HttpError(402, "AI features are part of Pro. Upgrade in Settings.");
  const used = await aiUsageThisMonth(s.user.id);
  if (used[kind] >= PLANS.pro.ai[kind]) {
    throw new HttpError(429, `You've reached this month's limit for this AI feature (${PLANS.pro.ai[kind]}). It resets on the 1st.`);
  }
  return s;
}

export async function logAi(userId: string, kind: AiKind, usage?: { input_tokens?: number; output_tokens?: number }) {
  await createAdminClient()
    .from("ai_usage")
    .insert({ user_id: userId, kind, input_tokens: usage?.input_tokens ?? null, output_tokens: usage?.output_tokens ?? null });
}

/** Next code in a category, e.g. LS-53 after LS-52. */
export async function nextCode(supabase: Awaited<ReturnType<typeof createClient>>, category: string) {
  const { data } = await supabase.from("items").select("code").eq("category", category);
  const max = Math.max(0, ...(data ?? []).map((r) => parseInt(r.code.split("-")[1] ?? "0", 10) || 0));
  return `${category}-${String(max + 1).padStart(2, "0")}`;
}

export function jsonError(e: unknown) {
  if (e instanceof HttpError) return Response.json({ error: e.message }, { status: e.status });
  // Supabase errors are plain objects with a message, not Error instances.
  const raw = typeof e === "object" && e && "message" in e ? String((e as { message: unknown }).message) : "";
  if (raw.includes("FREE_LIMIT")) {
    return Response.json({ error: raw.replace(/^.*FREE_LIMIT:\s*/, "") }, { status: 402 });
  }
  console.error(e);
  return Response.json({ error: "Something went wrong. Please try again." }, { status: 500 });
}
