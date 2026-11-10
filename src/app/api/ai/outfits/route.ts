import { z } from "zod";
import { requireAi, logAi, jsonError, HttpError, getItems, getStyleContext } from "@/lib/data";
import { createAdminClient } from "@/lib/supabase/admin";
import { suggestOutfits } from "@/lib/ai";

export async function POST(req: Request) {
  try {
    const s = await requireAi("outfits");
    const { request } = z.object({ request: z.string().max(300).default("") }).parse(await req.json().catch(() => ({})));
    const items = await getItems();
    if (items.length < 3) throw new HttpError(400, "Add at least 3 pieces first.");

    const { data, usage } = await suggestOutfits(items, await getStyleContext(), request);
    await logAi(s.user.id, "outfits", usage);

    const byCode = new Map(items.map((i) => [i.code.toUpperCase(), i.id]));
    const admin = createAdminClient();
    const saved = [];
    const shop: { id: string; source_id: string; item_type: string; color: string; why: string }[] = [];
    for (const o of data.outfits) {
      // Drop any code the model invented. Keep the outfit if real pieces plus missing ones make a look.
      const ids = [...new Set(o.codes.map((c) => byCode.get(c.toUpperCase())).filter((x): x is string => !!x))];
      if (ids.length + o.missing_pieces.length < 2 || ids.length < 1) continue;
      const { data: outfit, error } = await s.supabase
        .from("outfits")
        .insert({ name: o.name, item_ids: ids, source: "ai", why: o.why, seen: false, saved: false })
        .select()
        .single();
      if (error) throw error;
      saved.push(outfit);
      if (o.missing_pieces.length) {
        // Every garment the outfit needs but the closet lacks becomes an affiliate "Shop this" link.
        const { data: rows } = await admin
          .from("shop_suggestions")
          .insert(
            o.missing_pieces.map((p) => ({
              user_id: s.user.id,
              source: "outfit",
              source_id: outfit.id,
              item_type: p.item_type,
              color: p.color,
              category: p.category,
              why: p.why,
              query: p.search_query,
            })),
          )
          .select("id,source_id,item_type,color,why");
        shop.push(...(rows ?? []));
      }
    }
    return Response.json({ outfits: saved, shop });
  } catch (e) {
    return jsonError(e);
  }
}
