import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Анатолий Гусын — Репетитор по физике ЕГЭ",
  description:
    "Подготовка к ЕГЭ по физике без скучной душнины. Понятные объяснения, система подготовки, пробный урок и результат 80+ баллов.",
  icons: {
    icon: [{ url: "/logo.png", type: "image/png" }],
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
  openGraph: {
    title: "Анатолий Гусын | Физика ЕГЭ",
    description:
      "Подготовка к ЕГЭ по физике. Пробный урок, индивидуальный план подготовки и понятная система обучения.",
    type: "website",
    locale: "ru_RU",
    siteName: "Анатолий Гусын | Физика ЕГЭ",
  },
  twitter: {
    card: "summary",
    title: "Анатолий Гусын | Физика ЕГЭ",
    description:
      "Подготовка к ЕГЭ по физике. Пробный урок, индивидуальный план подготовки и понятная система обучения.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
