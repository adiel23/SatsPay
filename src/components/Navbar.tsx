"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Zap, Send, Download, ShieldCheck } from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();

  const navItems = [
    {
      href: "/",
      label: "Enviar Dinero",
      icon: Send,
      active: pathname === "/" || pathname.startsWith("/enviar"),
    },
    {
      href: "/reclamar",
      label: "Cobrar Remesa",
      icon: Download,
      active: pathname.startsWith("/reclamar"),
    },
  ];

  return (
    <header className="border-b border-slate-800/80 bg-slate-950/85 backdrop-blur-md sticky top-0 z-30 print:hidden">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="h-10 w-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:bg-amber-500/25 transition">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <span className="font-bold text-lg tracking-tight text-white block leading-none">
              Remesas<span className="text-amber-400">SV</span>
            </span>
            <span className="text-[11px] text-slate-400">
              Dólares al instante a El Salvador
            </span>
          </div>
        </Link>

        <nav className="flex items-center gap-1.5 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition ${
                  item.active
                    ? "bg-amber-500 text-slate-950 font-semibold shadow-sm"
                    : "text-slate-300 hover:text-white hover:bg-slate-800/70"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-xs text-emerald-300 font-medium">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
          <span>Depósito directo en USD a Chivo Wallet</span>
        </div>
      </div>
    </header>
  );
}
