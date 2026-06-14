import type { Metadata, Viewport } from "next";
import "./globals.css";
import AuthWrapper from "../components/AuthWrapper";
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { ThemeWrapper } from "../components/ThemeWrapper";

export const metadata: Metadata = {
  title: "E-Dokumen PROLAB",
  description: "Aplikasi Penomoran Dokumen PROLAB",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className="antialiased">
        <AntdRegistry>
          <ThemeWrapper>
            <AuthWrapper>{children}</AuthWrapper>
          </ThemeWrapper>
        </AntdRegistry>
      </body>
    </html>
  );
}
