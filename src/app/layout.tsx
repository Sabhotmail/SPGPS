import { Inter, Noto_Sans_Thai, Geist } from "next/font/google";
import "./globals.css";
import type { Metadata } from "next";
import { SessionProvider } from "@/components/SessionProvider";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const notoSansThai = Noto_Sans_Thai({
  subsets: ["thai", "latin"],
  variable: "--font-noto-thai",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SPGPS — GPS Tracking",
  description: "Scalefusion GPS tracking with group-based access control",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th" className={cn(inter.variable, notoSansThai.variable, "font-sans", geist.variable)}>
      <body>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
