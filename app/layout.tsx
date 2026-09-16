import type { Metadata } from "next";
import { Instrument_Sans } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

const instrumentSans = Instrument_Sans({
  variable: "--font-instrument",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

const vinciSerif = localFont({
  src: "./fonts/vinci_serif_light.woff2",
  variable: "--font-vinci",
  weight: "300",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SOGEA — Le cycle de l'eau",
  description:
    "Exploration au défilement du cycle de l'eau, du captage de la ressource au retour au milieu naturel.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${instrumentSans.variable} ${vinciSerif.variable}`}>
      <body>{children}</body>
    </html>
  );
}
