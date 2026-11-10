import { getItems, getStyleImages, requireSession } from "@/lib/data";
import { Stylist, type ChatMsg } from "./stylist";

export const metadata = { title: "Ask the stylist · My Style" };

export default async function StylistPage({ searchParams }: PageProps<"/style/stylist">) {
  const { supabase, pro, user } = await requireSession();
  const lookId = (await searchParams).look;
  const [items, { data: msgs }, { data: shop }, images] = await Promise.all([
    getItems(),
    supabase.from("chat_messages").select("id,role,content,codes,created_at").order("created_at", { ascending: false }).limit(60),
    supabase.from("shop_suggestions").select("id,source_id,item_type,color,why").eq("source", "chat"),
    typeof lookId === "string" ? getStyleImages() : Promise.resolve([]),
  ]);
  const look = images.find((i) => i.id === lookId && i.kind === "inspo") ?? null;
  return (
    <Stylist
      pro={pro}
      userId={user.id}
      items={items}
      initialMessages={((msgs ?? []) as ChatMsg[]).reverse()}
      initialShop={shop ?? []}
      look={look ? { photo_path: look.photo_path, photo_url: look.photo_url ?? null, name: look.ai_notes?.look ?? "this look" } : null}
    />
  );
}
