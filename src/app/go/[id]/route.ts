import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSession } from "@/lib/data";
import { affiliateUrl, retailerByKey } from "@/lib/affiliate";

/**
 * Outbound affiliate redirect: /go/<suggestion id>?r=<retailer key>
 * Logs the click, then sends the shopper to the retailer with affiliate tracking.
 */
export async function GET(req: Request, ctx: RouteContext<"/go/[id]">) {
  const { id } = await ctx.params;
  const retailer = retailerByKey(new URL(req.url).searchParams.get("r") ?? "");
  const admin = createAdminClient();
  const { data: suggestion } = await admin.from("shop_suggestions").select("id,query,user_id").eq("id", id).maybeSingle();
  if (!retailer || !suggestion) return NextResponse.redirect(new URL("/closet", req.url));

  const s = await getSession();
  await admin.from("affiliate_clicks").insert({ suggestion_id: suggestion.id, user_id: s?.user.id ?? null, retailer: retailer.key });

  return NextResponse.redirect(affiliateUrl(retailer, suggestion.query, suggestion.id), 302);
}
