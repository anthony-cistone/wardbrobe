import { z } from "zod";
import { getSession, jsonError, HttpError } from "@/lib/data";

const Patch = z.object({ name: z.string().trim().min(1).max(80), seen: z.boolean() }).partial();

export async function PATCH(req: Request, ctx: RouteContext<"/api/outfits/[id]">) {
  try {
    const s = await getSession();
    if (!s) throw new HttpError(401, "Please sign in.");
    const { id } = await ctx.params;
    const { data, error } = await s.supabase.from("outfits").update(Patch.parse(await req.json())).eq("id", id).select().single();
    if (error) throw error;
    return Response.json({ outfit: data });
  } catch (e) {
    return jsonError(e);
  }
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/outfits/[id]">) {
  try {
    const s = await getSession();
    if (!s) throw new HttpError(401, "Please sign in.");
    const { id } = await ctx.params;
    const { error } = await s.supabase.from("outfits").delete().eq("id", id);
    if (error) throw error;
    return Response.json({ ok: true });
  } catch (e) {
    return jsonError(e);
  }
}
