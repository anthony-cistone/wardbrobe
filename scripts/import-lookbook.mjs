#!/usr/bin/env node
/**
 * One-time import of the original Wardrobe Lookbook into an account in this app.
 *
 * Usage (after the account exists, i.e. you've signed up once):
 *   node --env-file=.env.local scripts/import-lookbook.mjs you@example.com scripts/lookbook-export/lookbook.html
 *
 * What it does:
 *   - Gives the account Pro (comped, no Stripe subscription) so the 30-piece free limit doesn't block the import.
 *   - Uploads each piece's photo to storage and creates the item with its original code (PNT-01, LS-53, ...).
 *   - Imports saved outfits from scripts/lookbook-export/outfits/*.json, if present.
 * Safe to re-run: pieces whose code already exists are skipped.
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { createClient } from "@supabase/supabase-js";

const [email, htmlPath] = process.argv.slice(2);
if (!email || !htmlPath) {
  console.error("Usage: node --env-file=.env.local scripts/import-lookbook.mjs <account email> <lookbook.html>");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (e.g. in .env.local).");
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });

// 1. Find the account
const { data: profile, error: pErr } = await db.from("profiles").select("id,plan").ilike("email", email).maybeSingle();
if (pErr || !profile) {
  console.error(`No account found for ${email}. Sign up in the app first.`);
  process.exit(1);
}
const userId = profile.id;
if (profile.plan !== "pro") {
  await db.from("profiles").update({ plan: "pro", subscription_status: null }).eq("id", userId);
  console.log("Comped the account to Pro.");
}

// 2. Pull the ITEMS array out of the lookbook page
const html = readFileSync(htmlPath, "utf8");
const m = html.match(/const ITEMS=(\[.*?\]);\n/s);
if (!m) {
  console.error("Could not find the ITEMS array in that file. Is it the lookbook HTML?");
  process.exit(1);
}
const ITEMS = JSON.parse(m[1]);
console.log(`Found ${ITEMS.length} pieces.`);

const CATS = new Set(["PNT", "SS", "LS", "JKT", "SHO", "ACC"]);
const { data: existing } = await db.from("items").select("id,code").eq("user_id", userId);
const idByCode = new Map((existing ?? []).map((r) => [r.code, r.id]));

let added = 0;
for (const it of ITEMS) {
  if (idByCode.has(it.c)) continue;
  if (!CATS.has(it.p)) {
    console.warn(`Skipping ${it.c}: unknown category ${it.p}`);
    continue;
  }
  // Prefer the larger photo; both are JPEG data URLs.
  const dataUrl = it.big || it.img;
  let photo_path = null;
  if (dataUrl?.startsWith("data:image/")) {
    const bytes = Buffer.from(dataUrl.split(",")[1], "base64");
    photo_path = `${userId}/${it.c}.jpg`;
    const { error } = await db.storage.from("closet").upload(photo_path, bytes, { contentType: "image/jpeg", upsert: true });
    if (error) {
      console.warn(`Photo upload failed for ${it.c}: ${error.message}`);
      photo_path = null;
    }
  }
  const { data, error } = await db
    .from("items")
    .insert({
      user_id: userId,
      code: it.c,
      category: it.p,
      item_type: it.t,
      color: it.col ?? "",
      details: it.det ?? "",
      flag: it.fl ?? "",
      photo_path,
      is_new: false,
    })
    .select("id")
    .single();
  if (error) {
    console.warn(`Could not add ${it.c}: ${error.message}`);
    continue;
  }
  idByCode.set(it.c, data.id);
  added++;
  if (added % 20 === 0) console.log(`  ${added} added…`);
}
console.log(`Added ${added} pieces (${ITEMS.length - added} already there or skipped).`);

// 3. Saved outfits exported from the lookbook's database
const outDir = join(dirname(htmlPath), "outfits");
if (existsSync(outDir)) {
  const { data: have } = await db.from("outfits").select("name").eq("user_id", userId);
  const haveNames = new Set((have ?? []).map((o) => o.name));
  let n = 0;
  for (const f of readdirSync(outDir).filter((f) => f.endsWith(".json"))) {
    const o = JSON.parse(readFileSync(join(outDir, f), "utf8"));
    const ids = (o.codes ?? []).map((c) => idByCode.get(c)).filter(Boolean);
    if (ids.length < 2 || haveNames.has(o.name)) continue;
    await db.from("outfits").insert({
      user_id: userId,
      name: o.name,
      item_ids: ids,
      source: o.by === "claude" ? "ai" : "user",
      why: o.why ?? null,
      created_at: o.t ? new Date(o.t).toISOString() : undefined,
    });
    haveNames.add(o.name);
    n++;
  }
  console.log(`Imported ${n} outfits.`);
}
console.log("Done.");
