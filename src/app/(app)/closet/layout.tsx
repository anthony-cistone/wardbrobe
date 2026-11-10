import { SubNav } from "../nav-links";

export default function ClosetLayout({ children }: LayoutProps<"/closet">) {
  return (
    <>
      <SubNav
        title="Closet"
        tabs={[
          { href: "/closet", label: "All pieces" },
          { href: "/closet/add", label: "Add & tag" },
          { href: "/closet/review", label: "Review" },
        ]}
      />
      {children}
    </>
  );
}
