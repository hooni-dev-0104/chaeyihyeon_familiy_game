import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "가족 게임 플랫폼",
  description: "이현이네와 채이네 가족이 함께하는 온라인 게임 플랫폼",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no",
  themeColor: "#6366f1",
  manifest: "/manifest.json",
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

