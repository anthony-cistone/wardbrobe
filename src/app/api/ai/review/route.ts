import { requireAi, logAi, jsonError, HttpError, getItems } from "@/lib/data";
import { createAdminClient } from "@/lib/supabase/admin";
import { reviewCloset } from "@/lib/ai";

export async function POST() {
  try {
    const s = await requireAi("review");
    const items = await getItems();
    if (items.length < 5) throw new HttpError(400, "Add at least 5 pieces for a useful review.");

    const { data, usage } = await reviewCloset(items, s.profile.style_notes);
    await logAi(s.user.id, "review", usage);

    const codes = new Set(items.map((i) => i.code.toUpperCase()));
    const advice = data.advice.filter((a) => codes.has(a.code.toUpperCase()));

    const admin = createAdminClient();
    const { data: review, error } = await admin
      .from("reviews")
      .insert({ user_id: s.user.id, summary: data.summary, advice })
      .select()
      .single();
    if (error) throw error;

    // Replace the previous review's shopping gaps with the new ones.
    await admin.from("shop_suggestions").update({ dismissed: true }).eq("user_id", s.user.id).eq("source", "review");
    if (data.gaps.length) {
      await admin.from("shop_suggestions").insert(
        data.gaps.map((g) => ({
          user_id: s.user.id,
          source: "review",
          source_id: review.id,
          item_type: g.item_type,
          color: g.color,
          category: g.category,
          why: g.why,
          query: g.search_query,
        })),
      );
    }
    return Response.json({ ok: true });
  } catch (e) {
    return jsonError(e);
  }
}
