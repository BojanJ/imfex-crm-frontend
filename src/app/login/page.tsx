'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { imfexStore } from '@/lib/store';
import { UserRole } from '@/types';
import {
  Shield,
  UserCheck,
  Wrench,
  Lock,
  Mail,
  ArrowRight,
  Sparkles,
  Building2,
  CheckCircle2,
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@imfex.com');
  const [password, setPassword] = useState('••••••••');
  const [role, setRole] = useState<UserRole>('SUPER_ADMIN');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    imfexStore.setCurrentRole(role);
    router.push('/');
  };

  const handleDemoLogin = (demoRole: UserRole, demoEmail: string) => {
    setRole(demoRole);
    setEmail(demoEmail);
    imfexStore.setCurrentRole(demoRole);
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decorative Gradient Orbs */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full space-y-6 relative z-10">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 px-3 py-1 rounded-full text-primary font-black text-sm">
            <Sparkles className="w-4 h-4 text-amber-500" /> IMFEX Enterprise Platform
          </div>
          <h1 className="text-3xl font-black tracking-tight text-foreground">
            Sign In to CRM
          </h1>
          <p className="text-xs text-muted-foreground">
            Sales Quoting, Operational Projects & Service Desk Management
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-card/90 backdrop-blur-xl border border-border rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
          <form onSubmit={handleLogin} className="space-y-4 text-xs">
            {/* Role Switcher */}
            <div>
              <label className="block font-bold text-muted-foreground uppercase text-[10px] mb-2">
                Select Sign-in Persona Role
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setRole('SUPER_ADMIN');
                    setEmail('admin@imfex.com');
                  }}
                  className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all ${
                    role === 'SUPER_ADMIN'
                      ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                      : 'bg-muted/40 border-border text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <Shield className="w-4 h-4" /> Super Admin
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRole('USER');
                    setEmail('sales@imfex.com');
                  }}
                  className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all ${
                    role === 'USER'
                      ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                      : 'bg-muted/40 border-border text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <UserCheck className="w-4 h-4" /> Sales Agent
                </button>
              </div>
            </div>

            <div>
              <label className="block font-semibold mb-1 text-muted-foreground">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-border bg-background font-bold outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold mb-1 text-muted-foreground">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-border bg-background font-bold outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-black text-xs hover:bg-primary/90 transition-all shadow-md flex items-center justify-center gap-2"
            >
              Sign In to Control Center <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Credentials Switcher */}
          <div className="pt-4 border-t border-border space-y-2 text-[11px]">
            <p className="font-bold text-muted-foreground uppercase text-[10px]">Quick Demo 1-Click Login</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleDemoLogin('SUPER_ADMIN', 'admin@imfex.com')}
                className="p-2 rounded-lg bg-muted/60 border border-border hover:bg-muted font-bold text-left flex items-center gap-2"
              >
                <Shield className="w-3.5 h-3.5 text-primary" />
                <div>
                  <p className="font-bold text-foreground">Super Admin</p>
                  <p className="text-[9px] text-muted-foreground">Full CRUD Privileges</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => handleDemoLogin('USER', 'sales@imfex.com')}
                className="p-2 rounded-lg bg-muted/60 border border-border hover:bg-muted font-bold text-left flex items-center gap-2"
              >
                <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
                <div>
                  <p className="font-bold text-foreground">Sales Rep</p>
                  <p className="text-[9px] text-muted-foreground">Quotes & Operations</p>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-[11px] text-center text-muted-foreground">
          IMFEX Engine v1.0 • Secure Enterprise Authentication
        </p>
      </div>
    </div>
  );
}
