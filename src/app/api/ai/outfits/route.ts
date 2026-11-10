import { z } from "zod";
import { requireAi, logAi, jsonError, HttpError, getItems } from "@/lib/data";
import { createAdminClient } from "@/lib/supabase/admin";
import { suggestOutfits } from "@/lib/ai";

export async function POST(req: Request) {
  try {
    const s = await requireAi("outfits");
    const { occasion } = z.object({ occasion: z.string().max(200).default("") }).parse(await req.json().catch(() => ({})));
    const items = await getItems();
    if (items.length < 3) throw new HttpError(400, "Add at least 3 pieces first.");

    const { data, usage } = await suggestOutfits(items, s.profile.style_notes, occasion);
    await logAi(s.user.id, "outfits", usage);

    const byCode = new Map(items.map((i) => [i.code.toUpperCase(), i.id]));
    const admin = createAdminClient();
    const saved = [];
    const shop = [];
    for (const o of data.outfits) {
      // Drop any code the model invented; keep the outfit only if 2+ real pieces remain.
      const ids = [...new Set(o.codes.map((c) => byCode.get(c.toUpperCase())).filter((x): x is string => !!x))];
      if (ids.length < 2) continue;
      const { data: outfit, error } = await s.supabase
        .from("outfits")
        .insert({ name: o.name, item_ids: ids, source: "ai", why: o.why, seen: false })
        .select()
        .single();
      if (error) throw error;
      saved.push(outfit);
      if (o.missing_piece) {
        const { data: row } = await admin.from("shop_suggestions").insert({
          user_id: s.user.id,
          source: "outfit",
          source_id: outfit.id,
          item_type: o.missing_piece.item_type,
          color: o.missing_piece.color,
          category: o.missing_piece.category,
          why: o.missing_piece.why,
          query: o.missing_piece.search_query,
        }).select("id,source_id,item_type,color,why").single();
        if (row) shop.push(row);
      }
    }
    return Response.json({ outfits: saved, shop });
  } catch (e) {
    return jsonError(e);
  }
}
