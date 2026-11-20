import { Outfit, Noto_Sans_Thai } from "next/font/google";
import "./globals.css";
import type { Metadata } from "next";
import { PwaProvider } from "@/components/PwaProvider";
import { SessionProvider } from "@/components/SessionProvider";
import { cn } from "@/lib/utils";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-brand",
  display: "swap",
});

const notoSansThai = Noto_Sans_Thai({
  subsets: ["thai", "latin"],
  variable: "--font-noto-thai",
  display: "swap",
});

export const metadata: Metadata = {
  applicationName: "SPGPS",
  title: "SPGPS — Soft Field Station",
  description: "Scalefusion GPS tracking with group-based access control",
  appleWebApp: {
    capable: true,
    title: "SPGPS",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover" as const,
  themeColor: "#3d6ea8",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="th"
      className={cn(outfit.variable, notoSansThai.variable, "font-sans")}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.getItem("spgps-theme")==="dark")document.documentElement.classList.add("dark")}catch(e){}`,
          }}
        />
      </head>
      <body>
        <PwaProvider>
          <SessionProvider>{children}</SessionProvider>
        </PwaProvider>
      </body>
    </html>
  );
}
