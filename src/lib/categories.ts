export const CATEGORIES = [
  { code: "PNT", label: "Pants" },
  { code: "SS", label: "Short sleeve" },
  { code: "LS", label: "Long sleeve" },
  { code: "JKT", label: "Jackets & coats" },
  { code: "SHO", label: "Shoes" },
  { code: "ACC", label: "Accessories" },
] as const;

export type CategoryCode = (typeof CATEGORIES)[number]["code"];
export const CATEGORY_CODES = CATEGORIES.map((c) => c.code) as [CategoryCode, ...CategoryCode[]];
export const categoryLabel = (c: string) => CATEGORIES.find((x) => x.code === c)?.label ?? c;
export const categoryOrder = (c: string) => CATEGORY_CODES.indexOf(c as CategoryCode);

export type Status = "keep" | "tailor" | "donate";

export type Item = {
  id: string;
  code: string;
  category: CategoryCode;
  item_type: string;
  color: string;
  details: string;
  flag: string;
  status: Status | null;
  favorite: boolean;
  notes: string;
  photo_path: string | null;
  is_new: boolean;
  created_at: string;
  photo_url?: string | null;
};

export type Outfit = {
  id: string;
  name: string;
  item_ids: string[];
  source: "user" | "ai";
  why: string | null;
  seen: boolean;
  created_at: string;
};

export function sortItems<T extends { category: string; code: string }>(items: T[]) {
  return [...items].sort(
    (a, b) => categoryOrder(a.category) - categoryOrder(b.category) || a.code.localeCompare(b.code, undefined, { numeric: true }),
  );
}
