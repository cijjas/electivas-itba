import type React from 'react';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from '@/components/ui/sonner';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'ITBA Rating Electivas',
  description:
    'Aplicación para calificar y comentar las materias electivas del ITBA',
  generator: 'Next.js',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='es' suppressHydrationWarning>
      <body className={inter.className}>
        {children}
        <Toaster richColors />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
