import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";
import "./globals.css";
import { ThemeApplier } from "@/components/theme/ThemeApplier";

const notoSansJP = Noto_Sans_JP({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-noto-sans-jp',
})

export const metadata: Metadata = {
  title: 'WorkFlow — タスク管理',
  description: 'クリエイターチームのタスク管理・稼働管理・納期管理ツール',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={`${notoSansJP.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            try {
              var theme = localStorage.getItem('workflow-theme') || 'system';
              var dark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
              if (dark) document.documentElement.classList.add('dark');
              else document.documentElement.classList.remove('dark');
            } catch(e) {}
          })();
        `}} />
      </head>
      <body>
        <ThemeApplier />
        {children}
      </body>
    </html>
  );
}
