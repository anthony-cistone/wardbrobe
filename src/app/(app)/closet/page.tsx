import { getItems, requireSession } from "@/lib/data";
import { PLANS } from "@/lib/plans";
import { ClosetView } from "./closet-view";

export const metadata = { title: "Closet" };

export default async function ClosetPage() {
  const { pro } = await requireSession();
  const items = await getItems();
  return <ClosetView initialItems={items} limit={pro ? null : PLANS.free.maxItems} />;
}
