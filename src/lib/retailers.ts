/** Retailers shown on "Shop this" links. Safe to import from client components. */
export type Retailer = { key: string; name: string; search: (q: string) => string };

const enc = encodeURIComponent;

export const RETAILERS: Retailer[] = [
  { key: "amazon", name: "Amazon", search: (q) => `https://www.amazon.com/s?k=${enc(q)}&i=fashion` },
  { key: "nordstrom", name: "Nordstrom", search: (q) => `https://www.nordstrom.com/sr?keyword=${enc(q)}` },
  { key: "uniqlo", name: "Uniqlo", search: (q) => `https://www.uniqlo.com/us/en/search?q=${enc(q)}` },
  { key: "jcrew", name: "J.Crew", search: (q) => `https://www.jcrew.com/r/search/?N=0&Nloc=en&Ntrm=${enc(q)}` },
];

export function retailerByKey(key: string) {
  return RETAILERS.find((r) => r.key === key);
}

