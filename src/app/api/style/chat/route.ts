import { z } from "zod";
import { requireAi, getSession, logAi, jsonError, getItems, getStyleContext, loadImage } from "@/lib/data";
import { createAdminClient } from "@/lib/supabase/admin";
import { stylistChat } from "@/lib/ai";

const Body = z.object({
  message: z.string().trim().max(2000).default(""),
  photo_path: z.string().max(200).nullable().default(null),
});

/** One turn with the AI stylist. Stores both sides; recommended buys become shop links. */
export async function POST(req: Request) {
  try {
    const s = await requireAi("chat");
    const { message, photo_path } = Body.parse(await req.json());
    if (!message && !photo_path) return Response.json({ error: "Type a question or attach a photo." }, { status: 400 });

    const [items, style, image, { data: past }] = await Promise.all([
      getItems(),
      getStyleContext(),
      photo_path ? loadImage(s.supabase, s.user.id, photo_path) : Promise.resolve(undefined),
      s.supabase.from("chat_messages").select("role,content").order("created_at", { ascending: false }).limit(20),
    ]);

    // Oldest first, starting with a user turn, with no two turns in a row from the same side.
    const history: { role: "user" | "assistant"; content: string }[] = [];
    for (const m of (past ?? []).reverse()) {
      const role = m.role as "user" | "assistant";
      if (!history.length && role !== "user") continue;
      if (history.at(-1)?.role === role) history[history.length - 1].content += "\n\n" + m.content;
      else history.push({ role, content: m.content });
    }
    if (history.at(-1)?.role === "user") history.pop(); // an unanswered question; the new one replaces it

    const { data, usage } = await stylistChat(items, style, history, message, image);
    await logAi(s.user.id, "chat", usage);

    const codes = new Set(items.map((i) => i.code.toUpperCase()));
    const admin = createAdminClient();
    const userText = (photo_path ? "[Shared a photo] " : "") + (message || "What do you think of this look?");
    await admin.from("chat_messages").insert({ user_id: s.user.id, role: "user", content: userText });
    const { data: reply, error } = await admin
      .from("chat_messages")
      .insert({ user_id: s.user.id, role: "assistant", content: data.reply, codes: data.codes.filter((c) => codes.has(c.toUpperCase())) })
      .select()
      .single();
    if (error) throw error;

    let shop: unknown[] = [];
    if (data.shop.length) {
      const { data: rows } = await admin
        .from("shop_suggestions")
        .insert(
          data.shop.map((p) => ({
            user_id: s.user.id,
            source: "chat",
            source_id: reply.id,
            item_type: p.item_type,
            color: p.color,
            category: p.category,
            why: p.why,
            query: p.search_query,
          })),
        )
        .select("id,source_id,item_type,color,why");
      shop = rows ?? [];
    }
    return Response.json({ user: { role: "user", content: userText }, reply, shop });
  } catch (e) {
    return jsonError(e);
  }
}

/** Clear the conversation. */
export async function DELETE() {
  try {
    const s = await getSession();
    if (!s) return Response.json({ error: "Please sign in." }, { status: 401 });
    await s.supabase.from("chat_messages").delete().eq("user_id", s.user.id);
    return Response.json({ ok: true });
  } catch (e) {
    return jsonError(e);
  }
}
