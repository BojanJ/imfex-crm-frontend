import type { Metadata } from 'next';
import './globals.css';
import { I18nProvider } from '@/lib/i18n-context';
import { ThemeProvider } from '@/lib/theme-context';
import { ToastProvider } from '@/components/ui/toastr';
import { LayoutWrapper } from '@/components/layout-wrapper';

export const metadata: Metadata = {
  title: 'IMFEX CRM & Operational Quoting Suite',
  description:
    'Enterprise CRM designed for dynamic custom product configurations, operational projects, service desk and PDF quote export.',
};

const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('imfex_theme');if(t==='light'){document.documentElement.classList.remove('dark');}else{document.documentElement.classList.add('dark');}}catch(e){document.documentElement.classList.add('dark');}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="mk" className="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="bg-background text-foreground antialiased min-h-screen transition-colors duration-150">
        <ThemeProvider>
          <I18nProvider>
            <ToastProvider>
              <LayoutWrapper>{children}</LayoutWrapper>
            </ToastProvider>
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
