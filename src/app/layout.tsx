import type { Metadata } from 'next';
import './globals.css';
import { I18nProvider } from '@/lib/i18n-context';
import { LayoutWrapper } from '@/components/layout-wrapper';

export const metadata: Metadata = {
  title: 'IMFEX CRM & Operational Quoting Suite',
  description: 'Enterprise CRM designed for dynamic custom product configurations, operational projects, service desk and PDF quote export.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-background text-foreground antialiased min-h-screen">
        <I18nProvider>
          <LayoutWrapper>{children}</LayoutWrapper>
        </I18nProvider>
      </body>
    </html>
  );
}
