import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Spark7 · 灵光7日卡",
  description: "用 AI 赋予你的猫一个灵魂",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Spark7",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0f0e17",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-[#0f0e17]">{children}</body>
    </html>
  );
}
