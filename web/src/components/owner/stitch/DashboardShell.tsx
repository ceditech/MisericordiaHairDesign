"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/src/providers/AuthProvider";

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "";
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, profile } = useAuth();
  const displayName = profile?.name || user?.displayName || user?.email?.split('@')[0] || "Admin";

  const navItems = [
    { name: "Overview", icon: "dashboard", href: "/owner" },
    { name: "Appointments", icon: "calendar_today", href: "/owner/appointments" },
    { name: "Service Styles", icon: "content_cut", href: "/owner/styles" },
    { name: "Inventory", icon: "inventory_2", href: "/owner/inventory" },
    { name: "Shop Sales", icon: "payments", href: "/owner/sales" },
    { name: "Affiliates", icon: "group_add", href: "/owner/affiliates" },
    { name: "Blog", icon: "book_online", href: "/owner/blog" },
    { name: "Settings", icon: "settings", href: "/owner/settings" },
  ];

  return (
    <div className="font-body text-slate-900 dark:text-slate-100 bg-[#f8f9ff] dark:bg-slate-900 min-h-screen">
      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 dark:bg-slate-900/80 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <nav className={`fixed left-0 top-0 h-screen w-64 py-8 gap-4 bg-slate-50 dark:bg-slate-950 rounded-r-3xl z-50 border-r border-slate-100 dark:border-slate-800 flex flex-col transition-transform duration-300 ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        <div className="px-8 mb-8 flex justify-between items-center">
          <div>
          <h1 className="font-headline font-extrabold text-brand-primary text-2xl tracking-tight">
            MHDESIGNS
          </h1>
          <p className="text-xs text-slate-500 font-medium uppercase tracking-widest mt-1">
            Management Portal
          </p>
          </div>
          <button onClick={() => setIsMobileMenuOpen(false)} className="lg:hidden text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="flex flex-col gap-1 px-4 overflow-y-auto flex-1">
          {navItems.map((item) => {
            const isActive = item.href === "/owner" ? pathname === "/owner" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-full transition-all duration-300 no-underline ${
                  isActive
                    ? "text-brand-primary bg-white dark:bg-slate-800 shadow-sm mx-2"
                    : "text-slate-500 dark:text-slate-400 hover:text-brand-primary hover:translate-x-1"
                }`}
              >
                <span
                  className="material-symbols-outlined"
                  style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
                >
                  {item.icon}
                </span>
                <span className="font-medium text-sm no-underline">{item.name}</span>
              </Link>
            );
          })}
        </div>
        <div className="mt-auto px-6">
          <Link href="/book" className="block w-full py-4 rounded-full bg-gradient-to-r from-brand-primary to-brand-secondary text-white font-semibold text-sm shadow-lg shadow-brand-primary/20 active:scale-95 duration-200 text-center">
            Book Appointment
          </Link>
        </div>
      </nav>

      {/* Main Canvas Area */}
      <main className="lg:ml-64 min-h-screen pb-20">
        {/* Top Navigation */}
        <header className="fixed top-0 right-0 left-0 lg:left-64 z-30 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md px-4 sm:px-6 py-4 flex justify-between items-center shadow-sm border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 sm:gap-4 flex-1">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden text-slate-500 hover:text-brand-primary transition-colors p-2 -ml-2"
            >
              <span className="material-symbols-outlined">menu</span>
            </button>
            <div className="relative w-full max-w-md group hidden sm:block">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-primary transition-colors">
                search
              </span>
              <input
                className="w-full bg-[#fdf6f7] dark:bg-slate-800 border-none rounded-full py-2.5 pl-12 pr-4 focus:ring-2 focus:ring-brand-primary/20 text-sm transition-all focus:outline-none text-slate-900 dark:text-slate-100"
                placeholder="Search appointments, styles or products..."
                type="text"
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button className="relative text-slate-500 hover:text-brand-primary transition-colors">
              <span className="material-symbols-outlined">notifications</span>
              <span className="absolute top-0 right-0 w-2 h-2 bg-brand-secondary rounded-full border-2 border-white dark:border-slate-950"></span>
            </button>
            <div className="flex items-center gap-3 pl-4 border-l border-slate-200 dark:border-slate-800">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{displayName}</p>
                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Admin</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary font-bold text-lg overflow-hidden uppercase">
                {displayName.charAt(0)}
              </div>
            </div>
          </div>
        </header>

        {/* Child Content */}
        <div className="pt-24 px-4 sm:px-8 pb-12">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-slate-950/90 backdrop-blur-xl border-t border-slate-100 dark:border-slate-800 flex justify-around items-center py-3 px-6 z-50">
        <Link href="/owner" className={`flex flex-col items-center gap-1 ${pathname === "/owner" ? "text-brand-primary" : "text-slate-400"}`}>
          <span className="material-symbols-outlined" style={pathname === "/owner" ? { fontVariationSettings: "'FILL' 1" } : {}}>dashboard</span>
          <span className="text-[10px] font-bold">Overview</span>
        </Link>
        <Link href="/owner/appointments" className={`flex flex-col items-center gap-1 ${pathname.startsWith("/owner/appointments") ? "text-brand-primary" : "text-slate-400"}`}>
          <span className="material-symbols-outlined" style={pathname.startsWith("/owner/appointments") ? { fontVariationSettings: "'FILL' 1" } : {}}>calendar_today</span>
          <span className="text-[10px] font-bold">Bookings</span>
        </Link>
        <Link href="/book" className="bg-gradient-to-tr from-brand-primary to-brand-secondary w-12 h-12 rounded-full -mt-10 flex items-center justify-center text-white shadow-lg active:scale-95 duration-200">
          <span className="material-symbols-outlined">add</span>
        </Link>
        <Link href="/owner/inventory" className={`flex flex-col items-center gap-1 ${pathname.startsWith("/owner/inventory") ? "text-brand-primary" : "text-slate-400"}`}>
          <span className="material-symbols-outlined" style={pathname.startsWith("/owner/inventory") ? { fontVariationSettings: "'FILL' 1" } : {}}>inventory_2</span>
          <span className="text-[10px] font-bold">Shop</span>
        </Link>
        <Link href="/owner/blog" className={`flex flex-col items-center gap-1 ${pathname.startsWith("/owner/blog") ? "text-brand-primary" : "text-slate-400"}`}>
          <span className="material-symbols-outlined" style={pathname.startsWith("/owner/blog") ? { fontVariationSettings: "'FILL' 1" } : {}}>book_online</span>
          <span className="text-[10px] font-bold">Blog</span>
        </Link>
        <Link href="/owner/sales" className={`flex flex-col items-center gap-1 ${pathname.startsWith("/owner/sales") ? "text-brand-primary" : "text-slate-400"}`}>
          <span className="material-symbols-outlined" style={pathname.startsWith("/owner/sales") ? { fontVariationSettings: "'FILL' 1" } : {}}>payments</span>
          <span className="text-[10px] font-bold">Sales</span>
        </Link>
      </nav>
    </div>
  );
}
