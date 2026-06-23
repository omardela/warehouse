import type { Metadata } from "next";
import Script from "next/script";
import { ThemeProvider } from "@/providers/theme-provider";
import { LocaleProvider } from "@/providers/locale-context";
import { getLocale, localeDir } from "@/core/i18n/locale";
import { getDictionary } from "@/core/i18n/get-dictionary";
import "./globals.css";

export const metadata: Metadata = {
  title: "LogiCore — Warehouse ERP",
  description: "Enterprise warehouse management system",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const dir = localeDir(locale);
  const dict = getDictionary(locale);

  return (
    <html lang={locale} dir={dir} className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
        >
          <LocaleProvider value={{ locale, dir, dict }}>
            {children}
          </LocaleProvider>
        </ThemeProvider>
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('theme');document.documentElement.classList.add(t==='light'?'light':'dark');}catch(e){}`,
          }}
        />
      </body>
    </html>
  );
}
