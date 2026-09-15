import type { Metadata } from "next";
import { Instrument_Sans } from "next/font/google";
import "./globals.css";

const instrumentSans = Instrument_Sans({
  variable: "--font-instrument",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "SOGEA — Le cycle de l'eau",
  description:
    "Exploration au défilement du cycle de l'eau, du captage de la ressource au retour au milieu naturel.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={instrumentSans.variable}>
      <body>{children}</body>
    </html>
  );
}
