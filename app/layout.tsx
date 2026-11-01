import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/src/components/Providers';
import { Navbar } from '@/src/components/layout/Navbar';
import { Footer } from '@/src/components/layout/Footer';
import { AuthGuard } from '@/src/utility/AuthGuard';
import Script from 'next/script';


const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'EduPortal | Assignment review',
  description: 'Create, submit, and review student assignments in one place.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <body className={`${inter.className} flex min-h-screen flex-col antialiased`}>
        <Script id="theme-init" strategy="beforeInteractive">
          {`try {
  const savedTheme = localStorage.getItem("theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.dataset.theme =
    savedTheme === "light" || savedTheme === "dark"
      ? savedTheme
      : prefersDark
        ? "dark"
        : "light";
} catch {
  document.documentElement.dataset.theme = "light";
}`}
        </Script>
        <Providers>
          <Navbar />
          <div className="flex-1">
            <AuthGuard>{children}</AuthGuard>
          </div>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}