import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "余烬协议 // The Ember Protocol",
  description: "A galaxy that computed itself into silence. Outer Wilds style 3D space investigation.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500;700&family=JetBrains+Mono:ital,wght@0,300;0,400;0,500;0,700;1,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-void text-holo-bright font-mono antialiased selection:bg-holo-cyan selection:text-void">
        <div className="crt-overlay" />
        <div className="screen-vignette" />
        {children}
      </body>
    </html>
  );
}
