import { z } from "zod";
import { getSession, jsonError, HttpError } from "@/lib/data";

export async function PATCH(req: Request) {
  try {
    const s = await getSession();
    if (!s) throw new HttpError(401, "Please sign in.");
    const { style_notes } = z.object({ style_notes: z.string().max(1000) }).parse(await req.json());
    const { error } = await s.supabase.from("profiles").update({ style_notes }).eq("id", s.user.id);
    if (error) throw error;
    return Response.json({ ok: true });
  } catch (e) {
    return jsonError(e);
  }
}
