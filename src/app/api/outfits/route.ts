import { z } from "zod";
import { getSession, jsonError, HttpError } from "@/lib/data";

const NewOutfit = z.object({
  name: z.string().trim().min(1).max(80),
  item_ids: z.array(z.uuid()).min(2).max(8),
});

export async function POST(req: Request) {
  try {
    const s = await getSession();
    if (!s) throw new HttpError(401, "Please sign in.");
    const body = NewOutfit.parse(await req.json());
    const { data, error } = await s.supabase.from("outfits").insert({ ...body, source: "user" }).select().single();
    if (error) throw error;
    return Response.json({ outfit: data });
  } catch (e) {
    if (e instanceof z.ZodError) return Response.json({ error: "An outfit needs a name and at least 2 pieces." }, { status: 400 });
    return jsonError(e);
  }
}
