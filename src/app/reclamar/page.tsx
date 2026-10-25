"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { Search, ArrowRight, ShieldCheck, Lock } from "lucide-react";

export default function ReclamarIndexPage() {
  const router = useRouter();
  const [code, setCode] = useState<string>("");

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const cleaned = code.trim().toUpperCase();
    if (!cleaned) return;
    router.push(`/reclamar/${encodeURIComponent(cleaned)}`);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <Navbar />

      <main className="max-w-xl mx-auto px-4 sm:px-6 py-14">
        <section className="rounded-2xl border border-slate-800 bg-slate-900/75 p-6 sm:p-8 shadow-2xl space-y-6">
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-full">
              Cobro de Remesa en El Salvador
            </span>
            <h1 className="text-2xl font-bold text-white mt-3">
              Recibe tus dólares en Chivo Wallet
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Ingresa el código único de tu remesa (ej. <code className="text-amber-300">SV-XXXX-XXX</code>). En el siguiente paso se te pedirá tu <strong>PIN secreto de 4 dígitos</strong>.
            </p>
          </div>

          <form onSubmit={handleSearch} className="space-y-4">
            <div className="relative">
              <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="SV-XXXX-XXX"
                className="w-full rounded-xl bg-slate-950 border border-slate-700 pl-10 pr-4 py-3.5 text-base font-mono uppercase text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <button
              type="submit"
              disabled={!code.trim()}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold px-6 py-3.5 text-sm transition"
            >
              Continuar a Verificación de PIN
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          <div className="pt-4 border-t border-slate-800/80 flex items-center justify-center gap-2 text-xs text-slate-400">
            <Lock className="h-3.5 w-3.5 text-emerald-400" />
            <span>Protegido contra accesos no autorizados con bloqueo automático de PIN.</span>
          </div>
        </section>
      </main>
    </div>
  );
}
