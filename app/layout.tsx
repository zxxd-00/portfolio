import type { Metadata } from "next";
import { Archivo, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/SiteHeader";
import { MapCollar } from "@/components/MapCollar";
import { Neatline } from "@/components/Neatline";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  axes: ["wdth"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: {
    default: "Zaid Adassi · Mechanical engineering",
    template: "%s · Zaid Adassi",
  },
  description:
    "Engineering portfolio of Zaid Adassi, mechanical engineering student at UC Berkeley passionate about hardware, automotive and robotics.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${archivo.variable} ${plexMono.variable}`}>
      <body className="min-h-screen">
        <Neatline />
        <div className="relative mx-[calc(var(--frame)+2px)] flex min-h-screen flex-col">
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <MapCollar />
        </div>
      </body>
    </html>
  );
}
