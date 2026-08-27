import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "余烬坞 // Ember Yard",
  description:
    "封闭船坞物理沙盒：插座焊接、累计冲量断裂、150 零件压测、坞门试炼地。轻碰不断、重击必断。",
};

export default function YardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
