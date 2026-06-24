import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AuthGuard from "./components/AuthGuard";
import FloatingNav from "./components/FloatingNav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "공로그 - 시험준비생을 위한 학습 플래너", template: "%s | 공로그" },
  description: "공부 플래너, 타이머, 커뮤니티, AI 학습 도우미까지. 시험 준비생을 위한 올인원 학습 관리 웹앱. 수능, 토익, 공무원, 편입 준비생 필수!",
  keywords: ["공부 플래너", "학습 관리", "수능 플래너", "토익 공부", "공무원 시험", "스터디 타이머", "공부 인증", "학습 커뮤니티", "공로그"],
  metadataBase: new URL("https://gonglog.vercel.app"),
  openGraph: {
    title: "공로그 - 시험준비생을 위한 학습 플래너",
    description: "공부 플래너, 타이머, 커뮤니티, AI 학습 도우미까지. 시험 준비를 공로그와 함께!",
    url: "https://gonglog.vercel.app",
    siteName: "공로그",
    locale: "ko_KR",
    type: "website",
    images: [{ url: "/icon-512.png", width: 512, height: 512, alt: "공로그" }],
  },
  twitter: {
    card: "summary",
    title: "공로그 - 시험준비생을 위한 학습 플래너",
    description: "공부 플래너, 타이머, 커뮤니티, AI 학습 도우미까지.",
    images: ["/icon-512.png"],
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "공로그",
  },
};

export const viewport: Viewport = {
  themeColor: "#C9A882",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className="min-h-full flex flex-col"><AuthGuard>{children}<FloatingNav /></AuthGuard></body>
    </html>
  );
}
