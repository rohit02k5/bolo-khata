import type { Metadata, Viewport } from "next";
import { Noto_Sans, Noto_Sans_Devanagari, Noto_Sans_Telugu } from "next/font/google";
import "./globals.css";

const sans = Noto_Sans({
  subsets: ["latin"], variable: "--font-sans", display: "swap",
});
const deva = Noto_Sans_Devanagari({
  subsets: ["devanagari"], variable: "--font-deva", display: "swap",
});
const telu = Noto_Sans_Telugu({
  subsets: ["telugu"], variable: "--font-te", display: "swap",
});

export const metadata: Metadata = {
  title: "Bolo Khata — voice-first kirana ledger",
  description:
    "Speak in Hinglish or Telugu; bills, stock and khata update. Built on Gnani AI Prisma + Timbre.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Bolo Khata" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbf7f0" },
    { media: "(prefers-color-scheme: dark)", color: "#171210" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${sans.variable} ${deva.variable} ${telu.variable}`}>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("bk_theme");if(t)document.documentElement.dataset.theme=t;else if(matchMedia("(prefers-color-scheme: dark)").matches)document.documentElement.dataset.theme="dark";}catch(e){}`,
          }}
        />
        {children}
      </body>
    </html>
  );
}
