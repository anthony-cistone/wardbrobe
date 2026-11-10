import type { Metadata } from "next";
import { Bricolage_Grotesque, Instrument_Sans, IBM_Plex_Mono } from "next/font/google";
import { APP_NAME } from "@/lib/plans";
import "./globals.css";

const display = Bricolage_Grotesque({ variable: "--font-bricolage", subsets: ["latin"], weight: ["500", "700"] });
const body = Instrument_Sans({ variable: "--font-instrument", subsets: ["latin"], weight: ["400", "500", "600"] });
const mono = IBM_Plex_Mono({ variable: "--font-plex-mono", subsets: ["latin"], weight: ["500"] });

export const metadata: Metadata = {
  title: { default: `${APP_NAME}: your closet, organized`, template: `%s · ${APP_NAME}` },
  description: "Photograph your clothes, get them tagged automatically, and build outfits from what you already own.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body className="min-h-dvh flex flex-col antialiased">{children}</body>
    </html>
  );
}
