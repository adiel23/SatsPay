"use client";

import React from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import SendRemittanceSection from "@/components/SendRemittanceSection";
import { Zap, ShieldCheck, DollarSign, Download, Lock } from "lucide-react";

export default function CustomerHomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex flex-col justify-between">
      <div>
        <Navbar />

        <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-10">
          {/* Hero para el cliente */}
          <section className="text-center max-w-3xl mx-auto space-y-4">
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
              Envía dólares a <span className="text-amber-400">El Salvador</span> en segundos
            </h1>
            <p className="text-base sm:text-lg text-slate-300">
              Rápido, seguro y sin complicaciones. Tu familiar recibe dólares directamente en su{" "}
              <strong className="text-white">Chivo Wallet</strong> usando su código de remesa y PIN de seguridad.
            </p>

            <div className="pt-2 flex flex-wrap items-center justify-center gap-3 text-xs text-slate-300">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800">
                <Zap className="h-3.5 w-3.5 text-amber-400" />
                Entrega en menos de 10 segundos
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800">
                <DollarSign className="h-3.5 w-3.5 text-emerald-400" />
                Reciben el monto exacto en USD
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800">
                <ShieldCheck className="h-3.5 w-3.5 text-sky-400" />
                Protegido con PIN de 4 dígitos
              </span>
            </div>
          </section>

          {/* Calculadora y Formulario de Envío */}
          <SendRemittanceSection />

          {/* Banner para quien está en El Salvador y quiere cobrar */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-white">
                ¿Te enviaron una remesa y estás en El Salvador?
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Ten a la mano tu código <code className="text-amber-300">SV-XXXX-XXX</code> y tu PIN de 4 dígitos para depositar tus dólares en Chivo Wallet.
              </p>
            </div>
            <Link
              href="/reclamar"
              className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-5 py-3 text-xs transition"
            >
              <Download className="h-4 w-4" />
              Cobrar mi Remesa Ahora
            </Link>
          </section>
        </main>
      </div>

      <footer className="border-t border-slate-900 py-6 mt-12 print:hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
          <span>© {new Date().getFullYear()} RemesasSV • Envíos instantáneos a El Salvador</span>
          <Link
            href="/admin"
            className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-400 transition"
          >
            <Lock className="h-3 w-3" />
            Acceso Administrativo
          </Link>
        </div>
      </footer>
    </div>
  );
}
