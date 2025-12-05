import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "가족 게임 플랫폼",
  description: "이현이네와 채이네 가족이 함께하는 온라인 게임 플랫폼",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#6366f1",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 min-h-screen">
        {children}
      </body>
    </html>
  );
}
