import "server-only";

/**
 * Affiliate links for pieces the AI suggests buying.
 *
 * Two ways to earn, configured with environment variables (see README):
 *  - AMAZON_ASSOCIATE_TAG: your Amazon Associates tracking ID, added to Amazon search links.
 *  - SKIMLINKS_PUBLISHER_ID or SOVRN_API_KEY: a link network that turns ordinary links to
 *    thousands of retailers into affiliate links, so other retailers earn too.
 * With neither set, links still work for users but earn nothing.
 */

import { RETAILERS, retailerByKey, type Retailer } from "@/lib/retailers";

const enc = encodeURIComponent;

export { RETAILERS, retailerByKey };

/** Final outbound URL with affiliate tracking applied. */
export function affiliateUrl(retailer: Retailer, query: string, subId: string) {
  let url = retailer.search(query);

  if (retailer.key === "amazon") {
    const tag = process.env.AMAZON_ASSOCIATE_TAG;
    return tag ? `${url}&tag=${enc(tag)}` : url;
  }

  const skim = process.env.SKIMLINKS_PUBLISHER_ID;
  const sovrn = process.env.SOVRN_API_KEY;
  // The sub-id ties a sale in the network's report back to the suggestion that produced it.
  if (skim) url = `https://go.skimresources.com/?id=${enc(skim)}&xs=1&xcust=${enc(subId)}&url=${enc(url)}`;
  else if (sovrn) url = `https://redirect.viglink.com?key=${enc(sovrn)}&cuid=${enc(subId)}&u=${enc(url)}`;
  return url;
}
