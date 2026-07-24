'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Navbar } from '@/components/navbar';
import { Sidebar } from '@/components/sidebar';
import { imfexStore } from '@/lib/store';
import { Sparkles, Loader2 } from 'lucide-react';

export const LayoutWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const router = useRouter();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const isLoginPage = pathname === '/login';

  useEffect(() => {
    const isAuthed = imfexStore.isAuthenticated();
    setIsAuthenticated(isAuthed);

    if (!isAuthed && !isLoginPage) {
      router.replace('/login');
    } else if (isAuthed && isLoginPage) {
      router.replace('/');
    }

    setIsAuthChecking(false);
  }, [pathname, isLoginPage, router]);

  // Auth Guard Loading State
  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center space-y-3">
        <div className="flex items-center gap-2 bg-primary text-primary-foreground px-3 py-1 rounded-xl font-black text-sm shadow-md">
          <Sparkles className="w-4 h-4 text-amber-300" /> IMFEX Enterprise
        </div>
        <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground animate-pulse">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          <span>Verifying Security Session...</span>
        </div>
      </div>
    );
  }

  // Prevent flashing protected content before redirecting to /login
  if (!isAuthenticated && !isLoginPage) {
    return null;
  }

  // Login Page View (Full Width)
  if (isLoginPage) {
    return <main className="min-h-screen bg-background">{children}</main>;
  }

  // Authenticated App Shell View
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar onMobileMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)} />
      <div className="flex flex-1">
        <Sidebar
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          isMobileOpen={isMobileMenuOpen}
          onMobileClose={() => setIsMobileMenuOpen(false)}
        />
        <main className="flex-1 p-4 sm:p-6 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
};
