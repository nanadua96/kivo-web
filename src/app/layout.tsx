import type { Metadata } from "next";
import {
  Archivo,
  Figtree,
  Google_Sans_Code,
  Hubot_Sans,
  Inter_Tight,
  Mona_Sans,
  Roboto_Mono,
} from "next/font/google";
// import { Inter_Tight } from "next/font/google";
import "./globals.css";
import localFont from "next/font/local";
import { Providers } from "./providers";

const fontPrimary = Figtree({
  variable: "--font-primary",
  subsets: ["latin"],
  display: "swap",
});

// const fontPrimary = Archivo({
//   variable: "--font-primary",
//   subsets: ["latin"],
//   display: "swap",
// });

const fontMono = Roboto_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

// const fontPrimary = localFont({
//   variable: "--font-primary",
//   src: "../HarmonyOS_Sans_Regular.ttf",
// });

export const metadata: Metadata = {
  title: "Kivo: Your AI Assistant for Chat, Work & Code",
  description:
    "Discover Kivo, your all-in-one AI assistant. Ask questions, write content, get work done, and build with code—all in one place. Start for free.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${fontPrimary.variable} ${fontMono.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
