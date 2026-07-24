import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";
import { ClientDiagnosticsBootstrap } from "@/components/diagnostics/ClientDiagnosticsBootstrap";
import { getPublicBuildId, getPublicDeploymentId } from "@/lib/diagnostics/build-id";
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
  other: {
    "app-build-id": getPublicBuildId(),
    ...(getPublicDeploymentId()
      ? { "app-deployment-id": getPublicDeploymentId()! }
      : {}),
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
        <script
          dangerouslySetInnerHTML={{
            __html: 'window.__APP_DIAG_HTML_LOADED__=Date.now();',
          }}
        />
        <ClientDiagnosticsBootstrap />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
