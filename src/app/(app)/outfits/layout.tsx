import { SubNav } from "../nav-links";

export default function OutfitsLayout({ children }: LayoutProps<"/outfits">) {
  return (
    <>
      <SubNav title="Outfits" tabs={[{ href: "/outfits", label: "Suggestions & saved" }]} />
      {children}
    </>
  );
}
