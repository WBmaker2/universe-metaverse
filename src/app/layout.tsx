import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "우주 음악 메타버스",
  description: "행성 사이를 이동하며 음악을 감상하는 수업용 메타버스",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
