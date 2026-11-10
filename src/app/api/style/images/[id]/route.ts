import { z } from "zod";
import { getSession, jsonError, HttpError } from "@/lib/data";

export async function PATCH(req: Request, ctx: RouteContext<"/api/style/images/[id]">) {
  try {
    const s = await getSession();
    if (!s) throw new HttpError(401, "Please sign in.");
    const { id } = await ctx.params;
    const { caption } = z.object({ caption: z.string().trim().max(300) }).parse(await req.json());
    const { data, error } = await s.supabase.from("style_images").update({ caption }).eq("id", id).select().single();
    if (error) throw error;
    return Response.json({ image: data });
  } catch (e) {
    return jsonError(e);
  }
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/style/images/[id]">) {
  try {
    const s = await getSession();
    if (!s) throw new HttpError(401, "Please sign in.");
    const { id } = await ctx.params;
    const { data: img } = await s.supabase.from("style_images").select("photo_path").eq("id", id).single();
    const { error } = await s.supabase.from("style_images").delete().eq("id", id);
    if (error) throw error;
    if (img?.photo_path) await s.supabase.storage.from("closet").remove([img.photo_path]);
    return Response.json({ ok: true });
  } catch (e) {
    return jsonError(e);
  }
}
