import { z } from "zod";
import { getSession, jsonError, HttpError } from "@/lib/data";

export async function PATCH(req: Request) {
  try {
    const s = await getSession();
    if (!s) throw new HttpError(401, "Please sign in.");
    const patch = z
      .object({ style_notes: z.string().max(1000), appearance_notes: z.string().max(2000), style_summary: z.string().max(1000) })
      .partial()
      .parse(await req.json());
    const { error } = await s.supabase.from("profiles").update(patch).eq("id", s.user.id);
    if (error) throw error;
    return Response.json({ ok: true });
  } catch (e) {
    return jsonError(e);
  }
}
