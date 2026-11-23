'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Navbar } from '@/components/navbar';
import { Sidebar } from '@/components/sidebar';
import { ChangePasswordModal } from '@/components/auth/change-password-modal';
import { imfexStore, useImfexStore } from '@/lib/store';
import { Loader2 } from 'lucide-react';

export const LayoutWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const router = useRouter();
  useImfexStore();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const isPublicAuthPage = pathname === '/login' || pathname === '/reset-password';
  const currentUser = imfexStore.getCurrentUser();
  const isAuthedNow = imfexStore.isAuthenticated();

  useEffect(() => {
    setIsAuthenticated(isAuthedNow);

    if (!isAuthedNow && !isPublicAuthPage) {
      router.replace('/login');
    } else if (isAuthedNow && pathname === '/login') {
      router.replace('/');
    }

    setIsAuthChecking(false);
  }, [pathname, isPublicAuthPage, isAuthedNow, router]);

  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3">
        <span className="bg-primary text-primary-foreground px-3 py-1 rounded-lg font-bold text-xs tracking-wider">
          IMFEX
        </span>
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
          <span>Проверка на сесија...</span>
        </div>
      </div>
    );
  }

  if ((!isAuthenticated || !isAuthedNow) && !isPublicAuthPage) {
    return null;
  }

  if (isPublicAuthPage) {
    return <main className="min-h-screen bg-background">{children}</main>;
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navbar onMobileMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)} />
      <div className="flex flex-1 min-w-0">
        <Sidebar
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          isMobileOpen={isMobileMenuOpen}
          onMobileClose={() => setIsMobileMenuOpen(false)}
        />
        <main className="flex-1 min-w-0 overflow-x-clip">
          <div className="max-w-[1440px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
            {children}
          </div>
        </main>
      </div>
      <ChangePasswordModal
        isOpen={Boolean(isAuthenticated && currentUser?.mustChangePassword)}
        forced
      />
    </div>
  );
};
