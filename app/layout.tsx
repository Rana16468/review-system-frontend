import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/src/components/Providers';
import { Navbar } from '@/src/components/layout/Navbar';
import { Footer } from '@/src/components/layout/Footer';
import { AuthGuard } from '@/src/utility/AuthGuard';


const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Project Review Platfrom ',
  description: 'Submit and review student assignments seamlessly',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen flex flex-col bg-white text-black antialiased `}>
        <Providers>
          <Navbar />
          <main className="flex-1 container mx-auto px-4 py-8">
           <AuthGuard>{children}</AuthGuard>
          </main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}