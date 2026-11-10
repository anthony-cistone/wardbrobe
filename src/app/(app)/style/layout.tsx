import { SubNav } from "../nav-links";

export default function StyleLayout({ children }: LayoutProps<"/style">) {
  return (
    <>
      <SubNav
        title="My Style"
        tabs={[
          { href: "/style", label: "Style board" },
          { href: "/style/me", label: "About me" },
          { href: "/style/stylist", label: "Ask the stylist" },
        ]}
      />
      {children}
    </>
  );
}
