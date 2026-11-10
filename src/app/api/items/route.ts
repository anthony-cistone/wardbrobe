import { z } from "zod";
import { getSession, nextCode, jsonError, HttpError } from "@/lib/data";
import { CATEGORY_CODES } from "@/lib/categories";

const NewItem = z.object({
  category: z.enum(CATEGORY_CODES),
  item_type: z.string().trim().min(1).max(80),
  color: z.string().trim().max(80).default(""),
  details: z.string().trim().max(300).default(""),
  flag: z.string().trim().max(200).default(""),
  photo_path: z.string().max(200).nullable().default(null),
});

export async function POST(req: Request) {
  try {
    const s = await getSession();
    if (!s) throw new HttpError(401, "Please sign in.");
    const body = NewItem.parse(await req.json());
    if (body.photo_path && !body.photo_path.startsWith(`${s.user.id}/`)) throw new HttpError(400, "Invalid photo.");

    // Retry once if two uploads race for the same code.
    for (let attempt = 0; attempt < 2; attempt++) {
      const code = await nextCode(s.supabase, body.category);
      const { data, error } = await s.supabase.from("items").insert({ ...body, code }).select().single();
      if (!error) return Response.json({ item: data });
      if (error.code !== "23505") throw error;
    }
    throw new HttpError(409, "Could not assign a code. Please try again.");
  } catch (e) {
    if (e instanceof z.ZodError) return Response.json({ error: "Please fill in the type and category." }, { status: 400 });
    return jsonError(e);
  }
}
