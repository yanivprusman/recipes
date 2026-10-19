import type { Metadata } from "next";
import "./globals.css";
import FeedbackChatMount from './FeedbackChatMount';
import { getViewLang } from "@/lib/view-lang";
import { dirOf } from "@/lib/recipe-i18n";

export const metadata: Metadata = {
  title: "recipes",
  description: "recipes",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const lang = await getViewLang();
  return (
    <html lang={lang} dir={dirOf(lang)}>
      <body>{children}
        <FeedbackChatMount />
</body>
    </html>
  );
}
