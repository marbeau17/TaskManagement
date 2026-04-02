import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";
import "./globals.css";
import { ThemeApplier } from "@/components/theme/ThemeApplier";
import { translations } from "@/lib/i18n/translations";

const notoSansJP = Noto_Sans_JP({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-noto-sans-jp',
})

const defaultLocale = 'ja'

export const metadata: Metadata = {
  title: translations[defaultLocale]['app.title'],
  description: translations[defaultLocale]['app.description'],
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
              var colorTheme = localStorage.getItem('workflow-color-theme') || 'meets';
              document.documentElement.setAttribute('data-theme', colorTheme);
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
