import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "余烬坞 // Ember Yard",
  description:
    "封闭船坞物理沙盒：抓放零件、Build 暂停、Simulate 落地。灰盒地基，焊缝与渲染后续批次。",
};

export default function YardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
