import { getItems, getOutfits, requireSession } from "@/lib/data";
import { OutfitsView } from "./outfits-view";

export const metadata = { title: "Outfits" };

export default async function OutfitsPage() {
  const { supabase, pro } = await requireSession();
  const [items, outfits, { data: shop }] = await Promise.all([
    getItems(),
    getOutfits(),
    supabase.from("shop_suggestions").select("id,source_id,item_type,color,why").eq("source", "outfit"),
  ]);
  return <OutfitsView items={items} initialOutfits={outfits} shop={shop ?? []} pro={pro} />;
}
