import { z } from "zod";
import { getSession, jsonError, HttpError } from "@/lib/data";
import { CATEGORY_CODES } from "@/lib/categories";

const Patch = z
  .object({
    item_type: z.string().trim().min(1).max(80),
    color: z.string().trim().max(80),
    details: z.string().trim().max(300),
    category: z.enum(CATEGORY_CODES),
    status: z.enum(["keep", "tailor", "donate"]).nullable(),
    favorite: z.boolean(),
    notes: z.string().max(1000),
    is_new: z.boolean(),
  })
  .partial();

export async function PATCH(req: Request, ctx: RouteContext<"/api/items/[id]">) {
  try {
    const s = await getSession();
    if (!s) throw new HttpError(401, "Please sign in.");
    const { id } = await ctx.params;
    const patch = Patch.parse(await req.json());
    const { data, error } = await s.supabase.from("items").update(patch).eq("id", id).select().single();
    if (error) throw error;
    return Response.json({ item: data });
  } catch (e) {
    return jsonError(e);
  }
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/items/[id]">) {
  try {
    const s = await getSession();
    if (!s) throw new HttpError(401, "Please sign in.");
    const { id } = await ctx.params;
    const { data: item } = await s.supabase.from("items").select("photo_path").eq("id", id).single();
    const { error } = await s.supabase.from("items").delete().eq("id", id);
    if (error) throw error;
    if (item?.photo_path) await s.supabase.storage.from("closet").remove([item.photo_path]);
    return Response.json({ ok: true });
  } catch (e) {
    return jsonError(e);
  }
}
