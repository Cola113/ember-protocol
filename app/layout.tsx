import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "余烬协议 // The Ember Protocol",
  description: "A galaxy that computed itself into silence. Outer Wilds style 3D space investigation.",
  metadataBase: new URL("https://ember-protocol-zeta.vercel.app"),
  openGraph: {
    title: "余烬协议 // The Ember Protocol",
    description: "九颗恒星。一台机器。四百年前的熄灭不是毁灭，而是写回。Astral Noir 硬科幻演绎推理游戏。",
    url: "https://ember-protocol-zeta.vercel.app",
    siteName: "The Ember Protocol",
    images: [
      {
        url: "https://ember-protocol-zeta.vercel.app/og-image.png",
        width: 1200,
        height: 675,
        alt: "The Ember Protocol // 余烬星弧 Astral Noir 全景",
      },
    ],
    locale: "zh_CN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "余烬协议 // The Ember Protocol",
    description: "九颗恒星。一台机器。四百年前的熄灭不是毁灭，而是写回。",
    images: ["https://ember-protocol-zeta.vercel.app/og-image.png"],
  },
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
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
